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
// Application logging (on submit) — powers dashboard stats
// ------------------------------------------------------------------
async function atsScore(payload) {
  const token = await getAuthToken();
  if (!token) return { error: 'auth_required', message: 'Please log in first' };
  return apiRequest('/ats/score', { method: 'POST', body: JSON.stringify(payload) });
}

async function logApplication(payload) {
  const token = await getAuthToken();
  if (!token) return { status: 'no_auth' };
  // Fire-and-forget; don't block the user's submit flow.
  apiRequest('/applications', {
    method: 'POST',
    body: JSON.stringify({
      company: payload.company ?? null,
      job_title: payload.job_title ?? null,
      job_url: payload.job_url ?? null,
      fields_filled: payload.fields_filled ?? 0,
      platform: payload.platform ?? 'linkedin',
    }),
  });
  return { status: 'logged' };
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
// Backend warm-up
// ------------------------------------------------------------------
// Render's free tier spins the backend down after ~15 minutes idle; the
// first request after that can take 10-30s+ to wake it up. The content
// script fires this the moment a job posting is opened — well before the
// user actually clicks Easy Apply — so the cold start (if any) happens
// while they're still reading the job description, not while they wait
// on a fill.
const HEALTH_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '') + '/health';
let _lastWarmAt = 0;
const WARM_MIN_INTERVAL = 60000; // don't hammer it more than once a minute

async function warmBackend() {
  const now = Date.now();
  if (now - _lastWarmAt < WARM_MIN_INTERVAL) return { status: 'skipped' };
  _lastWarmAt = now;
  try {
    await fetch(HEALTH_URL);
    return { status: 'ok' };
  } catch {
    return { status: 'unreachable' };
  }
}

// ------------------------------------------------------------------
// Message listener
// ------------------------------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handlers = {
    'RESOLVE_FIELDS': () => resolveFields(request.payload),
    'ATS_SCORE': () => atsScore(request.payload),
    'LOG_APPLICATION': () => logApplication(request.payload),
    'SUBMIT_FEEDBACK': () => submitFeedback(request.payload),
    'LOGIN': () => handleLogin(request.payload),
    'LOGOUT': () => handleLogout(),
    'GET_AUTH_STATUS': () => getAuthStatus(),
    'WARM_UP': () => warmBackend(),
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
// When the extension reloads or updates, content scripts in open tabs become
// orphaned — chrome.runtime.id goes invalid and all API calls fail.
// In dev: reload the tab (fastest, no in-progress application to protect).
// In production: re-inject the scripts without reloading, so active applications
// are not disrupted. A guard in content.js prevents double-injection.
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  try {
    const tabs = await chrome.tabs.query({ url: '*://*.linkedin.com/*' });
    if (!tabs.length) return;

    const self = await chrome.management.getSelf();
    if (self.installType === 'development') {
      for (const tab of tabs) {
        if (tab.id) chrome.tabs.reload(tab.id);
      }
      console.log(`[NeuroApply BG] Dev mode — reloaded ${tabs.length} LinkedIn tab(s)`);
      return;
    }

    // Production: silently re-inject so orphaned scripts come back alive.
    const files = [
      'src/content/fieldExtractor.js',
      'src/content/autofill.js',
      'src/content/content.js',
    ];
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['src/content/content.css'],
        });
        console.log(`[NeuroApply BG] Re-injected into tab ${tab.id}`);
      } catch { /* tab may be restricted (chrome:// etc.) — skip silently */ }
    }
  } catch (e) {
    console.warn('[NeuroApply BG] onInstalled handler failed:', e?.message);
  }
});

// ------------------------------------------------------------------
// Keep-warm alarm — pings the backend every 10 min so Render's free-tier
// dyno (sleeps after ~15 min idle) rarely gets the chance to go cold in
// the first place. chrome.alarms survives service worker suspension, so
// this fires even when no tab is actively using the extension.
// ------------------------------------------------------------------
chrome.alarms.create('na-keep-warm', { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'na-keep-warm') warmBackend();
});
warmBackend(); // also warm immediately on service worker (re)start

console.log('[NeuroApply] 🧠 Service worker loaded');
