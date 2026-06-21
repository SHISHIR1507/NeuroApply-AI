/**
 * NeuroApply AI — Full-Page Profile Chat
 * Guided Q&A onboarding + streaming free-form chat.
 */

const API = NEUROAPPLY_API;

const AVATAR_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
</svg>`;

const QUESTIONS = [
  { key: 'full_name',            q: "What's your full name?" },
  { key: 'current_title',        q: "What's your current job title?" },
  { key: 'current_company',      q: 'Which company are you at? (say "fresher" if not working)' },
  { key: 'years_of_experience',  q: 'How many years of experience do you have?' },
  { key: 'location',             q: 'Which city are you based in?' },
  { key: 'current_salary',       q: "What's your current CTC? (e.g. 4 LPA, 40k/month)" },
  { key: 'expected_salary',      q: "What's your expected CTC?" },
  { key: 'notice_period',        q: 'What\'s your notice period? (e.g. 1 month, immediate)' },
  { key: 'willing_to_relocate',  q: 'Are you open to relocation?' },
  { key: 'requires_sponsorship', q: 'Do you need visa sponsorship to work?' },
  { key: 'skills',               q: 'List your key technical skills (e.g. Python, React, SQL)' },
];

const LABELS = {
  full_name: 'Name', current_title: 'Job Title', current_company: 'Company',
  years_of_experience: 'Experience', location: 'Location',
  current_salary: 'Current CTC', expected_salary: 'Expected CTC',
  notice_period: 'Notice Period', willing_to_relocate: 'Open to Relocation',
  requires_sponsorship: 'Visa Sponsorship', skills: 'Skills',
  linkedin_url: 'LinkedIn', github_url: 'GitHub',
};

// ── State ────────────────────────────────────────────────────────────
let queue        = [];   // unanswered question objects
let qIdx         = 0;    // current index into queue
let isOnboarding = false;
let chatHistory  = [];
let isBusy       = false;

// ── DOM ──────────────────────────────────────────────────────────────
const chatArea    = document.getElementById('chatArea');
const msgInput    = document.getElementById('msgInput');
const sendBtn     = document.getElementById('sendBtn');
const connPill    = document.getElementById('connPill');
const connLabel   = document.getElementById('connLabel');
const signOutBtn  = document.getElementById('signOutBtn');
const progressWrap = document.getElementById('progressWrap');
const progressFill = document.getElementById('progressFill');
const heroEl      = document.getElementById('hero');

let heroGone = false;
function hideHero() {
  if (heroGone) return;
  heroGone = true;
  heroEl.classList.add('gone');
}

// ── Boot ─────────────────────────────────────────────────────────────
(async () => {
  const token = await getToken();
  if (!token) { redirectToExtension(); return; }

  try {
    const res = await fetch(`${API}/profile`, { headers: authHeader(token) });
    if (!res.ok) { redirectToExtension(); return; }
    const profile = await res.json();
    setConnected(true);
    startSession(profile);
  } catch {
    setConnected(false);
    addDivider('Cannot reach backend');
    botMessage("I can't connect to the backend right now. Make sure the backend is running.");
  }
})();

// ── Session start ─────────────────────────────────────────────────────
function startSession(profile) {
  queue = QUESTIONS.filter(q => {
    const v = profile[q.key];
    return v === null || v === undefined || v === '' ||
           (Array.isArray(v) && v.length === 0);
  });
  qIdx = 0;

  if (queue.length > 0) {
    isOnboarding = true;
    progressWrap.classList.remove('hidden');
    updateProgress(0, queue.length);
    const firstName = profile?.full_name?.split(' ')[0];
    const greeting  = firstName
      ? `Hey ${firstName}! Let me fill in a few missing details to complete your profile.`
      : "Hi! I'll ask you a few quick questions to build your application profile. You can always say \"skip\" for any question.";
    botMessage(greeting);
    setTimeout(askNext, 500);
  } else {
    isOnboarding = false;
    const firstName = profile?.full_name?.split(' ')[0] || 'there';
    botMessage(`Hey ${firstName}! Your profile looks complete. Tell me anything you'd like to update — or ask "what's my profile?"`);
    enableInput();
  }
}

// ── Guided Q&A ────────────────────────────────────────────────────────
function askNext() {
  if (qIdx >= queue.length) {
    finishOnboarding();
    return;
  }
  const q     = queue[qIdx];
  const total = queue.length;
  updateProgress(qIdx, total);
  botMessage(q.q, { badge: `${qIdx + 1} of ${total}` });
  enableInput();
}

function finishOnboarding() {
  isOnboarding = false;
  updateProgress(queue.length, queue.length);
  setTimeout(() => progressWrap.classList.add('hidden'), 800);

  const card = document.createElement('div');
  card.className = 'completion-card';
  card.innerHTML = `
    <div class="check">✅</div>
    <h3>Profile complete!</h3>
    <p>NeuroApply will now autofill your job applications on LinkedIn.<br>
       Toggle it ON from the extension popup and click Easy Apply.</p>
  `;
  chatArea.appendChild(card);
  scrollBottom();

  setTimeout(() => {
    botMessage("You can keep chatting to update anything — just say something like \"change my expected salary to 8 LPA\" or \"I moved to Bangalore\".");
    enableInput();
  }, 400);
}

// ── Send handler ──────────────────────────────────────────────────────
async function handleSend() {
  const text = msgInput.value.trim();
  if (!text || isBusy) return;

  disableInput();
  msgInput.value = '';
  resizeInput();
  userMessage(text);

  if (isOnboarding) {
    await onboardingAnswer(text);
  } else {
    await streamFreeChat(text);
  }
}

sendBtn.addEventListener('click', handleSend);
msgInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
});
msgInput.addEventListener('input', () => {
  resizeInput();
  sendBtn.disabled = msgInput.value.trim() === '';
});

signOutBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['authToken', 'refreshToken']);
  window.close();
});

// ── Onboarding answer → /chat/field ──────────────────────────────────
async function onboardingAnswer(text) {
  const q      = queue[qIdx];
  const typing = showTyping();
  const token  = await getToken();

  try {
    const res  = await fetch(`${API}/chat/field`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ field_key: q.key, raw_answer: text }),
    });

    typing.remove();

    if (!res.ok) { handleAuthError(res.status); return; }

    const data = await res.json();

    if (data.clarification_needed) {
      botMessage(data.clarification_message || "I didn't quite get that. Could you rephrase?");
      enableInput();
      return;
    }

    // Confirm what was understood
    const label   = LABELS[q.key] || q.key;
    const display = formatDisplay(q.key, data.display_value, data.normalized_value);
    const tags    = data.saved ? [label] : [];

    if (data.saved) {
      botMessage(`Got it — ${display}`, { tags });
    } else {
      botMessage('Skipped.');
    }

    qIdx++;
    setTimeout(askNext, 500);

  } catch {
    typing.remove();
    botMessage("Can't reach the backend. Is the backend running?");
    enableInput();
  }
}

// ── Free chat → /chat/stream (SSE) ───────────────────────────────────
async function streamFreeChat(text) {
  chatHistory.push({ role: 'user', content: text });

  const token   = await getToken();
  const bubble  = createStreamingBubble();

  try {
    const res = await fetch(`${API}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader(token) },
      body: JSON.stringify({ message: text, history: chatHistory.slice(-8) }),
    });

    if (!res.ok) { handleAuthError(res.status); return; }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer    = '';
    let fullReply = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep any partial line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') break;

        try {
          const evt = JSON.parse(raw);
          if (evt.type === 'delta') {
            fullReply += evt.content;
            appendToBubble(bubble, fullReply);
          } else if (evt.type === 'updates' && evt.fields) {
            const tags = Object.keys(evt.fields).map(k => LABELS[k] || k);
            addTagsToBubble(bubble, tags);
          }
        } catch { /* malformed chunk, skip */ }
      }
    }

    finalizeBubble(bubble, fullReply);
    chatHistory.push({ role: 'assistant', content: fullReply });

  } catch {
    bubble.remove();
    botMessage("Connection error. Make sure the backend is running.");
  }

  enableInput();
}

// ── Bubble builders ───────────────────────────────────────────────────
function userMessage(text) {
  hideHero();
  const row = document.createElement('div');
  row.className = 'msg-row user';
  const b = document.createElement('div');
  b.className = 'bubble user';
  b.textContent = text;
  row.appendChild(b);
  chatArea.appendChild(row);
  scrollBottom();
}


function botMessage(text, { badge = null, tags = [] } = {}) {
  hideHero();
  const row = document.createElement('div');
  row.className = 'msg-row bot';

  const av = document.createElement('div');
  av.className = 'avatar';
  av.innerHTML = AVATAR_SVG;
  row.appendChild(av);

  const b = document.createElement('div');
  b.className = 'bubble bot';

  if (badge) {
    const badgeEl = document.createElement('div');
    badgeEl.className = 'progress-badge';
    badgeEl.textContent = badge;
    b.appendChild(badgeEl);
  }

  const textEl = document.createElement('div');
  textEl.innerHTML = renderMarkdown(text);
  b.appendChild(textEl);

  if (tags.length > 0) {
    b.appendChild(buildTags(tags));
  }

  row.appendChild(b);
  chatArea.appendChild(row);
  scrollBottom();
  return b;
}

function showTyping() {
  const row = document.createElement('div');
  row.className = 'msg-row bot typing-row';

  const av = document.createElement('div');
  av.className = 'avatar';
  av.innerHTML = AVATAR_SVG;
  row.appendChild(av);

  const tb = document.createElement('div');
  tb.className = 'typing-bubble';
  tb.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>`;
  row.appendChild(tb);

  chatArea.appendChild(row);
  scrollBottom();
  return row;
}


// Streaming bubble — starts empty, text appended token-by-token
function createStreamingBubble() {
  hideHero();
  const row = document.createElement('div');
  row.className = 'msg-row bot';

  const av = document.createElement('div');
  av.className = 'avatar';
  av.innerHTML = AVATAR_SVG;
  row.appendChild(av);

  const b = document.createElement('div');
  b.className = 'bubble bot';

  const textEl = document.createElement('span');
  textEl.className = 'stream-text';

  const cur = document.createElement('span');
  cur.className = 'cursor';

  b.appendChild(textEl);
  b.appendChild(cur);
  row.appendChild(b);
  chatArea.appendChild(row);
  scrollBottom();

  return { row, bubble: b, textEl, cursor: cur };
}

function appendToBubble({ textEl, cursor }, fullText) {
  textEl.innerHTML = renderMarkdown(fullText);
  scrollBottom();
}

function addTagsToBubble({ bubble, cursor }, tags) {
  bubble.insertBefore(buildTags(tags), cursor);
}

function finalizeBubble({ cursor }) {
  cursor.remove();
}

function buildTags(tags) {
  const row = document.createElement('div');
  row.className = 'field-tags';
  tags.forEach(t => {
    const tag = document.createElement('span');
    tag.className = 'field-tag';
    tag.textContent = `✓ ${t}`;
    row.appendChild(tag);
  });
  return row;
}

// ── Helpers ───────────────────────────────────────────────────────────
function formatDisplay(key, displayValue, normalizedValue) {
  if (key === 'willing_to_relocate' || key === 'requires_sponsorship') {
    return normalizedValue === true ? 'Yes' : 'No';
  }
  if (key === 'skills' && Array.isArray(normalizedValue)) {
    return normalizedValue.join(', ');
  }
  if (key === 'years_of_experience') {
    return normalizedValue === 0 ? 'Fresher (0 years)' : `${normalizedValue} year${normalizedValue !== 1 ? 's' : ''}`;
  }
  return displayValue || String(normalizedValue ?? '');
}

function updateProgress(done, total) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  progressFill.style.width = `${pct}%`;
}

function addDivider(text) {
  const d = document.createElement('div');
  d.className = 'day-divider';
  d.textContent = text;
  chatArea.appendChild(d);
}

function scrollBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

function enableInput() {
  isBusy = false;
  msgInput.disabled = false;
  msgInput.focus();
  sendBtn.disabled = msgInput.value.trim() === '';
}

function disableInput() {
  isBusy = true;
  msgInput.disabled = true;
  sendBtn.disabled = true;
}

function resizeInput() {
  msgInput.style.height = 'auto';
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + 'px';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdown(str) {
  return escapeHtml(str)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function setConnected(on) {
  connPill.className    = `conn-pill ${on ? 'conn-on' : 'conn-off'}`;
  connLabel.textContent = on ? 'Connected' : 'Disconnected';
}

async function getToken() {
  const { authToken } = await chrome.storage.local.get('authToken');
  return authToken || null;
}

function authHeader(token) {
  return { 'Authorization': `Bearer ${token}` };
}

function handleAuthError(status) {
  if (status === 401) {
    chrome.storage.local.remove(['authToken', 'refreshToken']);
    botMessage("Your session expired. Please sign in again from the extension popup.");
    setConnected(false);
  } else {
    botMessage('Something went wrong. Please try again.');
    enableInput();
  }
}

function redirectToExtension() {
  botMessage("Please sign in from the NeuroApply extension popup first.");
  setConnected(false);
}
