/**
 * NeuroApply AI — Popup
 * Minimal launcher: toggle, profile page button, resume upload, sign out.
 */

const API = 'http://localhost:8000/api/v1';

document.addEventListener('DOMContentLoaded', async () => {
  const authSection     = document.getElementById('authSection');
  const mainSection     = document.getElementById('mainSection');
  const loginForm       = document.getElementById('loginForm');
  const registerForm    = document.getElementById('registerForm');
  const authError       = document.getElementById('authError');
  const statusIndicator = document.getElementById('statusIndicator');
  const enableToggle    = document.getElementById('enableToggle');
  const logoutBtn       = document.getElementById('logoutBtn');
  const openProfileBtn  = document.getElementById('openProfileBtn');
  const resumeUpload    = document.getElementById('resumeUpload');
  const resumeStatus    = document.getElementById('resumeStatus');
  const fillNowBtn      = document.getElementById('fillNowBtn');

  // ── Toggle ──────────────────────────────────────────────────────
  const { neuroapplyEnabled } = await chrome.storage.local.get('neuroapplyEnabled');
  enableToggle.checked = neuroapplyEnabled !== false;
  enableToggle.addEventListener('change', () => {
    chrome.storage.local.set({ neuroapplyEnabled: enableToggle.checked });
  });

  // ── Auth check ──────────────────────────────────────────────────
  const { authToken } = await chrome.storage.local.get('authToken');
  if (authToken) {
    try {
      const res = await fetch(`${API}/profile`, { headers: { 'Authorization': `Bearer ${authToken}` } });
      if (res.ok) {
        showMain();
        updateStatus('connected');
        loadResumeStatus(authToken);
      } else {
        await bg('LOGOUT');
        showAuth();
      }
    } catch {
      showAuth();
    }
  } else {
    showAuth();
  }

  // ── Fill this page (manual trigger) ────────────────────────────
  fillNowBtn.addEventListener('click', async () => {
    fillNowBtn.textContent = 'Filling…';
    fillNowBtn.disabled = true;

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { fillNowBtn.textContent = 'No active tab'; return; }

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'FILL_NOW' });
      if (response?.status === 'no_modal') {
        fillNowBtn.textContent = 'No Easy Apply modal found';
      } else if (response?.status === 'context_invalid') {
        fillNowBtn.textContent = 'Reload the LinkedIn tab first';
      } else {
        fillNowBtn.textContent = 'Done ✓';
      }
    } catch (err) {
      fillNowBtn.textContent = 'Reload LinkedIn tab first';
    }

    setTimeout(() => {
      fillNowBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Fill this page`;
      fillNowBtn.disabled = false;
    }, 3000);
  });

  // ── Open full-page profile chat ─────────────────────────────────
  openProfileBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/profile.html') });
  });

  // ── Auth form toggles ───────────────────────────────────────────
  document.getElementById('showRegister').addEventListener('click', e => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authError.classList.add('hidden');
  });
  document.getElementById('showLogin').addEventListener('click', e => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    authError.classList.add('hidden');
  });

  // ── Login ────────────────────────────────────────────────────────
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.textContent = 'Signing in…'; btn.classList.add('loading');

    const result = await bg('LOGIN', {
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value,
    });

    if (result?.status === 'logged_in') {
      const { authToken: tok } = await chrome.storage.local.get('authToken');
      showMain(); updateStatus('connected');
      loadResumeStatus(tok);
    } else {
      showError(result?.message || 'Login failed');
    }

    btn.textContent = 'Sign In'; btn.classList.remove('loading');
  });

  // ── Register ─────────────────────────────────────────────────────
  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('registerBtn');
    btn.textContent = 'Creating…'; btn.classList.add('loading');

    try {
      const res  = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:     document.getElementById('registerEmail').value,
          password:  document.getElementById('registerPassword').value,
          full_name: document.getElementById('registerName').value,
        }),
      });
      const data = await res.json();
      if (data.access_token) {
        await chrome.storage.local.set({ authToken: data.access_token, refreshToken: data.refresh_token });
        showMain(); updateStatus('connected');
      } else {
        showError(data.detail || 'Registration failed');
      }
    } catch { showError('Could not connect to backend'); }

    btn.textContent = 'Create Account'; btn.classList.remove('loading');
  });

  // ── Logout ───────────────────────────────────────────────────────
  logoutBtn.addEventListener('click', async () => {
    await bg('LOGOUT');
    showAuth(); updateStatus('disconnected');
  });

  // ── Resume upload ────────────────────────────────────────────────
  resumeUpload.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    resumeStatus.innerHTML = '<p class="muted">Uploading…</p>';

    const { authToken: tok } = await chrome.storage.local.get('authToken');
    const form = new FormData();
    form.append('file', file);

    try {
      const res  = await fetch(`${API}/resume/upload`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${tok}` }, body: form,
      });
      const data = await res.json();

      if (data.status === 'completed') {
        resumeStatus.innerHTML = `<p class="uploaded">✓ ${file.name} · ${data.fields_extracted || 0} fields</p>`;
      } else if (data.status === 'duplicate') {
        resumeStatus.innerHTML = '<p class="muted">Already processed</p>';
      } else {
        resumeStatus.innerHTML = `<p class="error-text">${data.message || 'Upload failed'}</p>`;
      }
    } catch {
      resumeStatus.innerHTML = '<p class="error-text">Connection error</p>';
    }
  });

  // ── Helpers ──────────────────────────────────────────────────────
  async function loadResumeStatus(token) {
    try {
      const res = await fetch(`${API}/resume/status`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        if (d.status === 'completed') resumeStatus.innerHTML = `<p class="uploaded">✓ ${d.file_name}</p>`;
      }
    } catch { /* silent */ }
  }

  function bg(type, payload = {}) {
    return new Promise(r => chrome.runtime.sendMessage({ type, payload }, r));
  }

  function showAuth() { authSection.classList.remove('hidden'); mainSection.classList.add('hidden'); }
  function showMain() { authSection.classList.add('hidden'); mainSection.classList.remove('hidden'); }
  function showError(msg) { authError.textContent = msg; authError.classList.remove('hidden'); }
  function updateStatus(s) {
    statusIndicator.className = `status-indicator status-${s}`;
    statusIndicator.querySelector('.status-text').textContent = s === 'connected' ? 'Connected' : 'Disconnected';
  }
});
