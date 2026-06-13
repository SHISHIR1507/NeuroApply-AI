/**
 * NeuroApply AI — Service Worker (Background Script)
 * Handles API communication, local caching, and message routing.
 */

// ------------------------------------------------------------------
// Configuration
// ------------------------------------------------------------------
const API_BASE_URL = 'http://localhost:8000/api/v1';
let authToken = null;

// ------------------------------------------------------------------
// Local cache (chrome.storage.local)
// ------------------------------------------------------------------
const LocalCache = {
  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key] || null;
  },

  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },

  async getAnswerCache() {
    return await this.get('answerCache') || {};
  },

  async cacheAnswer(fieldHash, value) {
    const cache = await this.getAnswerCache();
    cache[fieldHash] = { value, timestamp: Date.now() };
    await this.set('answerCache', cache);
  },

  async getCachedAnswer(fieldHash) {
    const cache = await this.getAnswerCache();
    const entry = cache[fieldHash];
    if (!entry) return null;
    // Expire after 24 hours
    if (Date.now() - entry.timestamp > 86400000) return null;
    return entry.value;
  },
};

// ------------------------------------------------------------------
// Auth token management
// ------------------------------------------------------------------
async function getAuthToken() {
  if (authToken) return authToken;
  const stored = await LocalCache.get('authToken');
  if (stored) {
    authToken = stored;
    return authToken;
  }
  return null;
}

async function setAuthToken(token) {
  authToken = token;
  await LocalCache.set('authToken', token);
}

// ------------------------------------------------------------------
// API Client
// ------------------------------------------------------------------
async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired — clear and notify
      authToken = null;
      await LocalCache.set('authToken', null);
      return { error: 'auth_required', message: 'Please log in again' };
    }

    const data = await response.json();
    
    if (!response.ok) {
      return { error: 'api_error', message: data.detail || 'API error', status: response.status };
    }

    return data;
  } catch (err) {
    console.error('[NeuroApply BG] API request failed:', err);
    return { error: 'network_error', message: 'Backend unreachable' };
  }
}

// ------------------------------------------------------------------
// Field Resolution
// ------------------------------------------------------------------
async function resolveFields(payload) {
  const token = await getAuthToken();
  if (!token) {
    return { error: 'auth_required', message: 'Please log in first' };
  }

  // Try backend
  const result = await apiRequest('/resolve', {
    method: 'POST',
    body: JSON.stringify({
      fields: payload.fields,
      platform: payload.platform || 'linkedin',
      job_url: payload.jobUrl,
    }),
  });

  if (result.error === 'network_error') {
    // Offline fallback: try local cache
    console.log('[NeuroApply BG] Backend offline, using local cache');
    const cachedResults = await Promise.all(
      payload.fields.map(async (field) => {
        const hash = simpleHash(field.label);
        const cached = await LocalCache.getCachedAnswer(hash);
        return {
          field_id: field.id,
          label: field.label,
          value: cached,
          source: cached ? 'local_cache' : 'unknown',
          confidence: cached ? 0.8 : 0.0,
        };
      })
    );

    return {
      fields: cachedResults,
      resolved_count: cachedResults.filter(f => f.value).length,
      total_count: cachedResults.length,
    };
  }

  // Cache successful results locally
  if (result.fields) {
    for (const field of result.fields) {
      if (field.value) {
        const hash = simpleHash(field.label);
        await LocalCache.cacheAnswer(hash, field.value);
      }
    }
  }

  return result;
}

// ------------------------------------------------------------------
// Feedback (user corrections)
// ------------------------------------------------------------------
async function submitFeedback(payload) {
  // Update local cache immediately
  const hash = simpleHash(payload.field_label);
  await LocalCache.cacheAnswer(hash, payload.corrected_value);

  // Send to backend (fire-and-forget)
  apiRequest('/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return { status: 'saved' };
}

// ------------------------------------------------------------------
// Utilities
// ------------------------------------------------------------------
function simpleHash(str) {
  let hash = 0;
  const normalized = str.toLowerCase().trim();
  for (let i = 0; i < normalized.length; i++) {
    const chr = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(36);
}

// ------------------------------------------------------------------
// Message listener
// ------------------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handlers = {
    'RESOLVE_FIELDS': () => resolveFields(request.payload),
    'SUBMIT_FEEDBACK': () => submitFeedback(request.payload),
    'LOGIN': () => handleLogin(request.payload),
    'LOGOUT': () => handleLogout(),
    'GET_AUTH_STATUS': () => getAuthStatus(),
  };

  const handler = handlers[request.type];
  if (handler) {
    handler().then(sendResponse).catch(err => {
      console.error('[NeuroApply BG] Handler error:', err);
      sendResponse({ error: 'internal', message: err.message });
    });
    return true; // Keep message channel open for async response
  }
});

// ------------------------------------------------------------------
// Auth helpers
// ------------------------------------------------------------------
async function handleLogin(payload) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (result.access_token) {
    await setAuthToken(result.access_token);
    await LocalCache.set('refreshToken', result.refresh_token);
    return { status: 'logged_in' };
  }

  return result;
}

async function handleLogout() {
  authToken = null;
  await LocalCache.set('authToken', null);
  await LocalCache.set('refreshToken', null);
  return { status: 'logged_out' };
}

async function getAuthStatus() {
  const token = await getAuthToken();
  return { authenticated: !!token };
}

console.log('[NeuroApply] 🧠 Service worker loaded');
