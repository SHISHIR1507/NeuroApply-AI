/**
 * NeuroApply AI — Service Worker (Background Script)
 * Handles API communication, local caching, and message routing.
 */

// ------------------------------------------------------------------
// Configuration
// ------------------------------------------------------------------
importScripts('../config.js'); // defines NEUROAPPLY_API
const API_BASE_URL = NEUROAPPLY_API;
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

  // Read the entire answer cache once — avoids N sequential storage reads
  const answerCache = await LocalCache.getAnswerCache();
  const now = Date.now();
  const MAX_AGE = 86400000; // 24h

  // Partition fields: local cache hits vs. backend-needed misses
  const localHits = [];        // parallel array to payload.fields; null = miss
  const fieldsForBackend = []; // only fields not in local cache

  for (const field of payload.fields) {
    const entry = answerCache[simpleHash(field.label)];
    if (entry && now - entry.timestamp <= MAX_AGE) {
      localHits.push({ field_id: field.id, label: field.label, value: entry.value, source: 'local_cache', confidence: 0.9 });
    } else {
      localHits.push(null);
      fieldsForBackend.push(field);
    }
  }

  // All fields answered locally — skip the network entirely
  if (fieldsForBackend.length === 0) {
    console.log(`[NeuroApply BG] Full local cache hit (${localHits.length} fields)`);
    return {
      fields: localHits,
      resolved_count: localHits.filter(f => f?.value).length,
      total_count: localHits.length,
    };
  }

  // Send only the uncached fields to the backend
  const result = await apiRequest('/resolve', {
    method: 'POST',
    body: JSON.stringify({
      fields: fieldsForBackend,
      platform: payload.platform || 'linkedin',
      job_url: payload.jobUrl,
    }),
  });

  if (result.error === 'network_error') {
    console.log('[NeuroApply BG] Backend offline, using local cache only');
    const allFields = localHits.map((hit, i) =>
      hit || { field_id: payload.fields[i].id, label: payload.fields[i].label, value: null, source: 'unknown', confidence: 0.0 }
    );
    return { fields: allFields, resolved_count: allFields.filter(f => f.value).length, total_count: allFields.length };
  }

  // Persist new backend results into the local cache (single write)
  if (result.fields) {
    const updatedCache = { ...answerCache };
    for (const field of result.fields) {
      if (field.value) updatedCache[simpleHash(field.label)] = { value: field.value, timestamp: now };
    }
    await LocalCache.set('answerCache', updatedCache);
  }

  // Merge local hits + backend results, preserving original field order
  if (result.fields) {
    let backendIdx = 0;
    const merged = localHits.map(hit => hit ?? (result.fields[backendIdx++] || null));
    return {
      fields: merged,
      resolved_count: merged.filter(f => f?.value).length,
      total_count: merged.length,
    };
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

// ------------------------------------------------------------------
// Auto-reload LinkedIn tabs when the extension reloads (DEV ONLY)
// ------------------------------------------------------------------
// Reloading the extension kills the content script in every open tab; it
// can't be revived without a page refresh. In development we just refresh
// those tabs automatically so there's no manual refresh step. In production
// we skip this — refreshing could wipe a user's in-progress application, so
// they get the in-page "needs a refresh" banner instead.
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const self = await chrome.management.getSelf();
    if (self.installType !== 'development') return;
    const tabs = await chrome.tabs.query({ url: '*://*.linkedin.com/*' });
    for (const tab of tabs) {
      if (tab.id) chrome.tabs.reload(tab.id);
    }
    console.log(`[NeuroApply BG] Dev mode — reloaded ${tabs.length} LinkedIn tab(s)`);
  } catch (e) {
    console.warn('[NeuroApply BG] Auto-reload skipped:', e?.message);
  }
});

console.log('[NeuroApply] 🧠 Service worker loaded');
