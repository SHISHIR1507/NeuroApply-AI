/**
 * NeuroApply AI — Popup Logic
 * Handles auth, profile management, resume upload, and stats display.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ------------------------------------------------------------------
  // DOM References
  // ------------------------------------------------------------------
  const authSection = document.getElementById('authSection');
  const mainSection = document.getElementById('mainSection');
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const statusIndicator = document.getElementById('statusIndicator');
  const authError = document.getElementById('authError');

  // Auth
  const showRegister = document.getElementById('showRegister');
  const showLogin = document.getElementById('showLogin');

  // Profile
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const profileFields = {
    years_of_experience: document.getElementById('profileYoe'),
    current_title: document.getElementById('profileTitle'),
    current_salary: document.getElementById('profileCurrentSalary'),
    expected_salary: document.getElementById('profileSalary'),
    notice_period: document.getElementById('profileNotice'),
    location: document.getElementById('profileLocation'),
  };

  // Resume
  const resumeUpload = document.getElementById('resumeUpload');
  const resumeStatus = document.getElementById('resumeStatus');

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  const enableToggle = document.getElementById('enableToggle');

  // ------------------------------------------------------------------
  // Init: Load toggle state + auth status
  // ------------------------------------------------------------------
  const { neuroapplyEnabled } = await chrome.storage.local.get('neuroapplyEnabled');
  enableToggle.checked = neuroapplyEnabled !== false; // default ON only if explicitly set

  enableToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ neuroapplyEnabled: enableToggle.checked });
    console.log('[NeuroApply] Autofill', enableToggle.checked ? 'enabled' : 'disabled');
  });

  const authStatus = await sendMessage('GET_AUTH_STATUS');
  if (authStatus?.authenticated) {
    // Validate token is actually still good with a real API call
    const token = (await chrome.storage.local.get('authToken')).authToken;
    try {
      const check = await fetch('http://localhost:8000/api/v1/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (check.ok) {
        showMainView();
        const profile = await check.json();
        populateProfile(profile);
        updateStatus('connected');
      } else {
        // Token expired — force re-login
        await sendMessage('LOGOUT');
        showAuthView();
        updateStatus('disconnected');
      }
    } catch {
      showAuthView();
      updateStatus('disconnected');
    }
  } else {
    showAuthView();
    updateStatus('disconnected');
  }

  // ------------------------------------------------------------------
  // Auth toggle
  // ------------------------------------------------------------------
  showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authError.classList.add('hidden');
  });

  showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    authError.classList.add('hidden');
  });

  // ------------------------------------------------------------------
  // Login
  // ------------------------------------------------------------------
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const loginBtn = document.getElementById('loginBtn');
    loginBtn.textContent = 'Signing in...';
    loginBtn.classList.add('loading');

    const result = await sendMessage('LOGIN', { email, password });

    if (result?.status === 'logged_in') {
      showMainView();
      loadProfile();
      updateStatus('connected');
    } else {
      showError(result?.message || 'Login failed');
    }

    loginBtn.textContent = 'Sign In';
    loginBtn.classList.remove('loading');
  });

  // ------------------------------------------------------------------
  // Register
  // ------------------------------------------------------------------
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const full_name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    const registerBtn = document.getElementById('registerBtn');
    registerBtn.textContent = 'Creating account...';
    registerBtn.classList.add('loading');

    // Register via API directly
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name }),
      });
      const data = await response.json();

      if (data.access_token) {
        // Store token via background
        await chrome.storage.local.set({
          authToken: data.access_token,
          refreshToken: data.refresh_token,
        });
        showMainView();
        loadProfile();
        updateStatus('connected');
      } else {
        showError(data.detail || 'Registration failed');
      }
    } catch (err) {
      showError('Could not connect to backend');
    }

    registerBtn.textContent = 'Create Account';
    registerBtn.classList.remove('loading');
  });

  // ------------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------------
  logoutBtn.addEventListener('click', async () => {
    await sendMessage('LOGOUT');
    showAuthView();
    updateStatus('disconnected');
  });

  // ------------------------------------------------------------------
  // Save Profile
  // ------------------------------------------------------------------
  saveProfileBtn.addEventListener('click', async () => {
    saveProfileBtn.textContent = 'Saving...';
    saveProfileBtn.classList.add('loading');

    const update = {};
    for (const [key, input] of Object.entries(profileFields)) {
      const value = input.value.trim();
      if (value) {
        update[key] = key === 'years_of_experience' ? parseInt(value) : value;
      }
    }

    const token = (await chrome.storage.local.get('authToken')).authToken;
    try {
      const response = await fetch('http://localhost:8000/api/v1/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(update),
      });

      if (response.ok) {
        saveProfileBtn.textContent = '✓ Saved!';
        setTimeout(() => { saveProfileBtn.textContent = 'Save Profile'; }, 2000);
      } else {
        saveProfileBtn.textContent = 'Save Failed';
        setTimeout(() => { saveProfileBtn.textContent = 'Save Profile'; }, 2000);
      }
    } catch {
      saveProfileBtn.textContent = 'Error';
      setTimeout(() => { saveProfileBtn.textContent = 'Save Profile'; }, 2000);
    }

    saveProfileBtn.classList.remove('loading');
  });

  // ------------------------------------------------------------------
  // Resume Upload
  // ------------------------------------------------------------------
  resumeUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    resumeStatus.innerHTML = '<p class="muted">Uploading and parsing...</p>';

    const token = (await chrome.storage.local.get('authToken')).authToken;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/v1/resume/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();

      if (data.status === 'completed') {
        resumeStatus.innerHTML = `
          <p class="uploaded">✓ ${file.name}</p>
          <p class="muted">${data.fields_extracted || 0} fields extracted · ${data.chunks_embedded || 0} chunks embedded</p>
        `;
        // Reload profile (resume may have backfilled fields)
        loadProfile();
      } else if (data.status === 'duplicate') {
        resumeStatus.innerHTML = '<p class="muted">Resume already processed</p>';
      } else {
        resumeStatus.innerHTML = `<p class="error-text">${data.message || 'Upload failed'}</p>`;
      }
    } catch {
      resumeStatus.innerHTML = '<p class="error-text">Could not connect to backend</p>';
    }
  });

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  async function sendMessage(type, payload = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, payload }, resolve);
    });
  }

  function showAuthView() {
    authSection.classList.remove('hidden');
    mainSection.classList.add('hidden');
  }

  function showMainView() {
    authSection.classList.add('hidden');
    mainSection.classList.remove('hidden');
  }

  function showError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
  }

  function updateStatus(status) {
    statusIndicator.className = `status-indicator status-${status}`;
    statusIndicator.querySelector('.status-text').textContent =
      status === 'connected' ? 'Connected' : 'Disconnected';
  }

  function populateProfile(profile) {
    for (const [key, input] of Object.entries(profileFields)) {
      if (profile[key] != null) input.value = profile[key];
    }
    // Show resume status if available
    if (profile.resume_count > 0 || profile.has_resume) {
      resumeStatus.innerHTML = '<p class="uploaded">✓ Resume on file</p>';
    }
  }

  async function loadProfile() {
    const token = (await chrome.storage.local.get('authToken')).authToken;
    if (!token) return;
    try {
      const response = await fetch('http://localhost:8000/api/v1/profile', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) populateProfile(await response.json());
    } catch { /* silent */ }
  }
});
