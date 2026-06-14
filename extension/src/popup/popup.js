/**
 * NeuroApply AI — Popup Logic
 * Chat-driven profile builder + resume upload + ON/OFF toggle.
 */

const API = 'http://localhost:8000/api/v1';

document.addEventListener('DOMContentLoaded', async () => {
  // ------------------------------------------------------------------
  // DOM refs
  // ------------------------------------------------------------------
  const authSection     = document.getElementById('authSection');
  const mainSection     = document.getElementById('mainSection');
  const loginForm       = document.getElementById('loginForm');
  const registerForm    = document.getElementById('registerForm');
  const authError       = document.getElementById('authError');
  const showRegisterBtn = document.getElementById('showRegister');
  const showLoginBtn    = document.getElementById('showLogin');
  const statusIndicator = document.getElementById('statusIndicator');
  const enableToggle    = document.getElementById('enableToggle');
  const logoutBtn       = document.getElementById('logoutBtn');
  const resumeUpload    = document.getElementById('resumeUpload');
  const resumeStatus    = document.getElementById('resumeStatus');
  const chatMessages    = document.getElementById('chatMessages');
  const chatInput       = document.getElementById('chatInput');
  const chatSendBtn     = document.getElementById('chatSendBtn');

  // In-memory conversation history for multi-turn context (last N turns sent to backend)
  let chatHistory = [];

  // ------------------------------------------------------------------
  // Init: toggle state + auth check
  // ------------------------------------------------------------------
  const { neuroapplyEnabled } = await chrome.storage.local.get('neuroapplyEnabled');
  enableToggle.checked = neuroapplyEnabled !== false;

  enableToggle.addEventListener('change', async () => {
    await chrome.storage.local.set({ neuroapplyEnabled: enableToggle.checked });
  });

  const authStatus = await sendMessage('GET_AUTH_STATUS');
  if (authStatus?.authenticated) {
    const token = (await chrome.storage.local.get('authToken')).authToken;
    try {
      const check = await fetch(`${API}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (check.ok) {
        const profile = await check.json();
        showMainView();
        updateStatus('connected');
        initChat(profile);
        loadResumeStatus(token);
      } else {
        await sendMessage('LOGOUT');
        showAuthView();
      }
    } catch {
      showAuthView();
    }
  } else {
    showAuthView();
  }

  // ------------------------------------------------------------------
  // Auth form toggles
  // ------------------------------------------------------------------
  showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authError.classList.add('hidden');
  });

  showLoginBtn.addEventListener('click', (e) => {
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
    const email    = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.textContent = 'Signing in…';
    loginBtn.classList.add('loading');

    const result = await sendMessage('LOGIN', { email, password });
    if (result?.status === 'logged_in') {
      const token = (await chrome.storage.local.get('authToken')).authToken;
      const res   = await fetch(`${API}/profile`, { headers: { 'Authorization': `Bearer ${token}` } });
      const profile = res.ok ? await res.json() : {};
      showMainView();
      updateStatus('connected');
      initChat(profile);
      loadResumeStatus(token);
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
    const email     = document.getElementById('registerEmail').value;
    const password  = document.getElementById('registerPassword').value;
    const btn       = document.getElementById('registerBtn');
    btn.textContent = 'Creating…';
    btn.classList.add('loading');

    try {
      const response = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name }),
      });
      const data = await response.json();
      if (data.access_token) {
        await chrome.storage.local.set({
          authToken: data.access_token,
          refreshToken: data.refresh_token,
        });
        showMainView();
        updateStatus('connected');
        initChat({});
      } else {
        showError(data.detail || 'Registration failed');
      }
    } catch {
      showError('Could not connect to backend');
    }

    btn.textContent = 'Create Account';
    btn.classList.remove('loading');
  });

  // ------------------------------------------------------------------
  // Logout
  // ------------------------------------------------------------------
  logoutBtn.addEventListener('click', async () => {
    await sendMessage('LOGOUT');
    chatHistory = [];
    chatMessages.innerHTML = '';
    showAuthView();
    updateStatus('disconnected');
  });

  // ------------------------------------------------------------------
  // Chat — init with greeting based on existing profile
  // ------------------------------------------------------------------
  function initChat(profile) {
    chatMessages.innerHTML = '';
    chatHistory = [];

    let greeting;
    if (profile?.full_name) {
      const firstName = profile.full_name.split(' ')[0];
      greeting = `Hey ${firstName}! What would you like to update? You can tell me your expected salary, skills, notice period — or ask "what's my profile?"`;
    } else {
      greeting = `Hi! I'm your profile assistant. Tell me about yourself and I'll fill your application profile automatically.\n\nTry: "I'm a software engineer with 1 year of experience, current CTC 4 LPA, expected 6 LPA, based in Hyderabad, open to relocation."`;
    }

    appendBotMessage(greeting);
  }

  // ------------------------------------------------------------------
  // Chat — send message
  // ------------------------------------------------------------------
  async function sendChat(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    appendUserMessage(trimmed);
    chatInput.value = '';
    autoResizeInput();

    const typingEl = appendTyping();
    chatSendBtn.disabled = true;

    const token = (await chrome.storage.local.get('authToken')).authToken;

    try {
      const response = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: trimmed,
          history: chatHistory.slice(-8),
        }),
      });

      typingEl.remove();

      if (response.ok) {
        const data = await response.json();
        appendBotMessage(data.reply, data.updated_fields);
        chatHistory.push({ role: 'user',      content: trimmed });
        chatHistory.push({ role: 'assistant', content: data.reply });
      } else if (response.status === 401) {
        await sendMessage('LOGOUT');
        showAuthView();
        updateStatus('disconnected');
      } else {
        appendBotMessage('Something went wrong. Please try again.');
      }
    } catch {
      typingEl.remove();
      appendBotMessage("Can't reach the backend. Make sure it's running on localhost:8000.");
    }

    chatSendBtn.disabled = false;
  }

  chatSendBtn.addEventListener('click', () => sendChat(chatInput.value));

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChat(chatInput.value);
    }
  });

  chatInput.addEventListener('input', autoResizeInput);

  function autoResizeInput() {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 80) + 'px';
  }

  // ------------------------------------------------------------------
  // Chat — bubble renderers
  // ------------------------------------------------------------------
  function appendUserMessage(text) {
    const el = document.createElement('div');
    el.className = 'chat-bubble user';
    el.textContent = text;
    chatMessages.appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendBotMessage(text, updatedFields = {}) {
    const el = document.createElement('div');
    el.className = 'chat-bubble bot';
    el.textContent = text;

    const keys = Object.keys(updatedFields || {});
    if (keys.length > 0) {
      const tags = document.createElement('div');
      tags.className = 'chat-tags';
      keys.forEach(k => {
        const tag = document.createElement('span');
        tag.className = 'chat-tag';
        tag.textContent = formatFieldKey(k);
        tags.appendChild(tag);
      });
      el.appendChild(tags);
    }

    chatMessages.appendChild(el);
    scrollToBottom();
    return el;
  }

  function appendTyping() {
    const el = document.createElement('div');
    el.className = 'chat-bubble typing';
    el.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    chatMessages.appendChild(el);
    scrollToBottom();
    return el;
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function formatFieldKey(key) {
    const labels = {
      full_name: 'Name', phone: 'Phone', location: 'Location',
      years_of_experience: 'Experience', current_title: 'Title',
      current_company: 'Company', current_salary: 'Current CTC',
      expected_salary: 'Expected CTC', notice_period: 'Notice Period',
      work_authorization: 'Work Auth', willing_to_relocate: 'Relocation',
      requires_sponsorship: 'Sponsorship', linkedin_url: 'LinkedIn',
      github_url: 'GitHub', skills: 'Skills',
    };
    return labels[key] || key;
  }

  // ------------------------------------------------------------------
  // Resume upload
  // ------------------------------------------------------------------
  resumeUpload.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    resumeStatus.innerHTML = '<p class="muted">Uploading…</p>';

    const token = (await chrome.storage.local.get('authToken')).authToken;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API}/resume/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();

      if (data.status === 'completed') {
        resumeStatus.innerHTML = `<p class="uploaded">✓ ${file.name} · ${data.fields_extracted || 0} fields</p>`;
        appendBotMessage(`Resume uploaded! Extracted ${data.fields_extracted || 0} fields and embedded ${data.chunks_embedded || 0} chunks. Your profile has been auto-filled where fields were empty.`);
      } else if (data.status === 'duplicate') {
        resumeStatus.innerHTML = '<p class="muted">Already processed</p>';
        appendBotMessage('This resume is already in your profile.');
      } else {
        resumeStatus.innerHTML = `<p class="error-text">${data.message || 'Upload failed'}</p>`;
      }
    } catch {
      resumeStatus.innerHTML = '<p class="error-text">Connection error</p>';
    }
  });

  async function loadResumeStatus(token) {
    try {
      const response = await fetch(`${API}/resume/status`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'completed') {
          resumeStatus.innerHTML = `<p class="uploaded">✓ ${data.file_name}</p>`;
        }
      }
    } catch { /* silent */ }
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  function sendMessage(type, payload = {}) {
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

  function showError(msg) {
    authError.textContent = msg;
    authError.classList.remove('hidden');
  }

  function updateStatus(status) {
    statusIndicator.className = `status-indicator status-${status}`;
    statusIndicator.querySelector('.status-text').textContent =
      status === 'connected' ? 'Connected' : 'Disconnected';
  }
});
