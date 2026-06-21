/**
 * NeuroApply AI — Content Script
 */

(() => {
  let isProcessing = false;
  let lastProcessedFields = null;
  let _debounceTimer = null;
  let _observerActive = false;
  let _heartbeat = null;

  // Application tracking — accumulated across a multi-step Easy Apply flow.
  let lastCompany = null;
  let lastFilledTotal = 0;

  // ── isEnabled cache ──────────────────────────────────────────────────
  // Avoids a chrome.storage.local.get() on every DOM mutation.
  let _enabledCache = null;
  let _enabledCacheTime = 0;
  const ENABLED_CACHE_TTL = 5000;

  function invalidateEnabledCache() {
    _enabledCache = null;
    _enabledCacheTime = 0;
  }

  async function isEnabled() {
    if (!isContextValid()) return false;
    const now = Date.now();
    if (_enabledCache !== null && now - _enabledCacheTime < ENABLED_CACHE_TTL) {
      return _enabledCache;
    }
    try {
      const { neuroapplyEnabled } = await chrome.storage.local.get('neuroapplyEnabled');
      _enabledCache = neuroapplyEnabled !== false;
      _enabledCacheTime = Date.now();
      return _enabledCache;
    } catch {
      return false;
    }
  }

  // ── Context validity ─────────────────────────────────────────────────
  function isContextValid() {
    try {
      return !!chrome.runtime?.id;
    } catch {
      return false;
    }
  }

  // ── Reload banner ─────────────────────────────────────────────────────
  // Shown when extension is reloaded while tab stays open (context invalidated).
  // A content script can never reconnect to a reloaded extension — the page
  // MUST be refreshed. We make that obvious and one-click.
  function showReloadBanner() {
    if (document.querySelector('.neuroapply-reload-banner')) return;
    const banner = document.createElement('div');
    banner.className = 'neuroapply-reload-banner';
    banner.innerHTML =
      '<span style="font-size:16px">🔄</span>' +
      '<span><strong>NeuroApply needs a refresh</strong><br>' +
      '<span style="opacity:.85;font-size:12px">The extension reloaded — click to refresh this tab and re-enable autofill.</span></span>';
    Object.assign(banner.style, {
      position: 'fixed',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      color: '#fff',
      padding: '14px 20px',
      borderRadius: '12px',
      fontSize: '13.5px',
      lineHeight: '1.45',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      zIndex: '2147483647',
      boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.2)',
      cursor: 'pointer',
      maxWidth: '420px',
    });
    banner.onclick = () => location.reload();
    document.body.appendChild(banner);
  }

  // ── Clean shutdown on context loss ───────────────────────────────────
  // Once the extension context is invalidated there is nothing we can do but
  // tell the user to refresh. Stop ALL activity so we never spam the console
  // with chrome-extension://invalid/ errors.
  let _dead = false;
  function die() {
    if (_dead) return;
    _dead = true;
    try { observer.disconnect(); } catch {}
    _observerActive = false;
    clearTimeout(_debounceTimer);
    clearInterval(_heartbeat);
    showReloadBanner();
  }

  // ── Chat Widget ──────────────────────────────────────────────────────
  const ChatWidget = (() => {
    let root = null;
    let body = null;
    let typingEl = null;
    let closeTimer = null;

    const QUIPS = [
      "On it! ⚡",
      "Let me handle this ✨",
      "Easy Apply? Easy done 🚀",
      "I got you 👊",
    ];

    function build() {
      if (root) return;
      root = document.createElement('div');
      root.id = 'na-widget';
      root.innerHTML = `
        <div class="na-header">
          <div class="na-brand">
            <div class="na-brand-dot"></div>
            NeuroApply
          </div>
          <button class="na-close" title="Dismiss">×</button>
        </div>
        <div class="na-body"></div>
      `;
      root.querySelector('.na-close').addEventListener('click', close);
      document.body.appendChild(root);
      body = root.querySelector('.na-body');
    }

    function open() {
      build();
      clearTimeout(closeTimer);
      root.classList.remove('na-closing');
      void root.offsetWidth; // force reflow so transition fires
      root.classList.add('na-open');
    }

    function close() {
      if (!root) return;
      clearTimeout(closeTimer);
      root.classList.add('na-closing');
      root.classList.remove('na-open');
    }

    function clear() {
      if (body) body.innerHTML = '';
      typingEl = null;
    }

    function say(html, delayMs = 0) {
      build();
      const add = () => {
        stopTyping();
        const m = document.createElement('div');
        m.className = 'na-msg';
        m.innerHTML = html;
        body.appendChild(m);
        body.scrollTop = body.scrollHeight;
      };
      delayMs ? setTimeout(add, delayMs) : add();
    }

    function startTyping() {
      if (typingEl) return;
      build();
      typingEl = document.createElement('div');
      typingEl.className = 'na-typing-bubble';
      typingEl.innerHTML = '<div class="na-dot"></div><div class="na-dot"></div><div class="na-dot"></div>';
      body.appendChild(typingEl);
      body.scrollTop = body.scrollHeight;
    }

    function stopTyping() {
      if (typingEl) { typingEl.remove(); typingEl = null; }
    }

    function scheduleClose(ms) {
      clearTimeout(closeTimer);
      closeTimer = setTimeout(close, ms);
    }

    function isOpen() {
      return root?.classList.contains('na-open');
    }

    function quip() {
      return QUIPS[Math.floor(Math.random() * QUIPS.length)];
    }

    return { open, close, clear, say, startTyping, stopTyping, scheduleClose, isOpen, quip };
  })();

  // ── Modal detection ──────────────────────────────────────────────────
  // Only matches LinkedIn's actual Easy Apply overlay — never search filters,
  // inline page content, or other dialogs.
  function findEasyApplyModal() {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const dialog of dialogs) {
      const rect = dialog.getBoundingClientRect();
      if (rect.width < 200 || rect.height < 150) continue;

      // 1. aria-label on the dialog element itself
      const ariaLabel = (dialog.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('easy apply') || ariaLabel.startsWith('apply to')) {
        if (dialog.querySelector('input, select, textarea')) return dialog;
        continue;
      }

      // 2. aria-labelledby pointing to a heading
      const labelId = dialog.getAttribute('aria-labelledby');
      if (labelId) {
        const heading = document.getElementById(labelId);
        if (heading) {
          const t = heading.textContent.trim().toLowerCase();
          if (t === 'easy apply' || t.startsWith('apply to')) {
            if (dialog.querySelector('input, select, textarea')) return dialog;
          }
          continue;
        }
      }

      // 3. h1/h2/h3 inside the dialog whose text is "Apply to …" or "Easy Apply"
      for (const h of dialog.querySelectorAll('h1, h2, h3')) {
        const t = h.textContent.trim().toLowerCase();
        if (t === 'easy apply' || t.startsWith('apply to')) {
          if (dialog.querySelector('input, select, textarea')) return dialog;
          break;
        }
      }
    }
    return null;
  }

  // ── Modal processing ─────────────────────────────────────────────────
  function cropLabel(label) {
    return label.length > 30 ? label.slice(0, 29) + '…' : label;
  }

  // Pull the company name from the modal's "Apply to {Company}" heading.
  function extractCompany(modal) {
    for (const h of modal.querySelectorAll('h1, h2, h3')) {
      const m = (h.textContent || '').trim().match(/^Apply to (.+)$/i);
      if (m) return m[1].trim().slice(0, 200);
    }
    return null;
  }

  // Best-effort job title from the underlying job posting page.
  function extractJobTitle() {
    const el = document.querySelector(
      '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .t-24.job-details-jobs-unified-top-card__job-title, h1'
    );
    const t = el?.textContent?.trim();
    return t ? t.slice(0, 200) : null;
  }

  // Resolve fields via the service worker, but never hang forever.
  // MV3 service workers sleep; a dead/slow worker must not lock isProcessing.
  function resolveWithTimeout(payload, ms = 15000) {
    return Promise.race([
      chrome.runtime.sendMessage({ type: 'RESOLVE_FIELDS', payload }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('resolve_timeout')), ms)),
    ]);
  }

  async function processModal(modal) {
    if (isProcessing) return;

    // ── Cheap pre-check FIRST — runs on every debounced mutation. ──
    // It must not touch the widget unless there's genuinely new work,
    // otherwise the widget flashes open/closed as LinkedIn mutates the DOM.
    let fields;
    try {
      fields = window.FieldExtractor.extractFields(modal);
    } catch {
      return;
    }
    if (!fields.length) return;

    const fieldSignature = fields.map(f => f.label).join('|');
    if (fieldSignature === lastProcessedFields) return; // already handled — stay silent

    // ── Commit. Mark processed up-front so rapid re-entry bails above. ──
    isProcessing = true;
    lastProcessedFields = fieldSignature;
    modal.dataset.neuroapplyModal = 'true';

    ChatWidget.open();
    ChatWidget.clear();
    console.log(`[NeuroApply] Found ${fields.length} fields:`, fields.map(f => f.label));
    ChatWidget.say(`${ChatWidget.quip()} Found <b>${fields.length}</b> question${fields.length !== 1 ? 's' : ''} to fill.`);
    ChatWidget.startTyping();

    try {
      if (!isContextValid()) { lastProcessedFields = null; return; }

      const response = await resolveWithTimeout({
        fields: fields.map(f => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required,
          options: f.options?.map(o => typeof o === 'string' ? o : o.text),
          currentValue: f.currentValue,
        })),
        platform: 'linkedin',
        jobUrl: window.location.href,
      });

      ChatWidget.stopTyping();

      if (response?.error) {
        console.error(`[NeuroApply] Backend error: ${response.error} — ${response.message}`);
        // Keep the signature so we don't hammer a down backend on every mutation.
        // Recovery: "Fill this page" or clicking Next resets it.
        ChatWidget.say(`⚠️ ${response.message || response.error}`);
        ChatWidget.say('Tip: click <b>Fill this page</b> in the popup to retry.', 300);
        ChatWidget.scheduleClose(6000);
        return;
      }

      if (response && response.fields) {
        console.log(`[NeuroApply] Resolved ${response.resolved_count}/${response.total_count} fields`);

        const enrichedFields = response.fields.map((resolved, i) => ({
          ...fields[i],
          ...resolved,
        }));

        const result = window.Autofill.fillAll(modal, enrichedFields);
        console.log(`[NeuroApply] Filled: ${result.filled}, Unresolved: ${result.unresolved}`);

        // Track for application logging (accumulates across multi-step flow)
        lastCompany = extractCompany(modal) || lastCompany;
        lastFilledTotal += result.filled;

        // Show per-field status (cap at 6 lines to keep widget compact)
        const lines = enrichedFields.slice(0, 6).map(f =>
          f.value
            ? `<span class="na-ok">✓</span> ${cropLabel(f.label)}`
            : `<span class="na-warn">⚠</span> ${cropLabel(f.label)}`
        );
        if (enrichedFields.length > 6) {
          lines.push(`<span class="na-muted">+ ${enrichedFields.length - 6} more</span>`);
        }
        ChatWidget.say(lines.join('<br>'));

        // Done summary
        const total = result.filled + result.unresolved;
        const doneHtml = result.unresolved === 0
          ? `All <b>${result.filled}</b> filled — you're good! ✨`
          : `Filled <b>${result.filled}/${total}</b> · <span class="na-warn">${result.unresolved} need your input</span>`;
        ChatWidget.say(doneHtml, 350);
        ChatWidget.scheduleClose(10000);
      } else {
        console.warn('[NeuroApply] Unexpected response:', response);
        ChatWidget.say('Got an unexpected response. Check console.');
        ChatWidget.scheduleClose(5000);
      }
    } catch (err) {
      const timedOut = err?.message === 'resolve_timeout';
      console.error('[NeuroApply] Error processing modal:', err);
      ChatWidget.stopTyping();
      ChatWidget.say(timedOut
        ? '⏱ Backend took too long. Click <b>Fill this page</b> to retry.'
        : 'Something went wrong — check the console.');
      ChatWidget.scheduleClose(6000);
    } finally {
      isProcessing = false;
    }
  }

  // ── Notification ─────────────────────────────────────────────────────
  function showNotification(filled, unresolved) {
    const existing = document.querySelector('.neuroapply-notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = 'neuroapply-notification';
    notification.innerHTML = `
      <div class="neuroapply-notification-content">
        <span class="neuroapply-notification-icon">🧠</span>
        <span class="neuroapply-notification-text">
          NeuroApply: ${filled} field${filled !== 1 ? 's' : ''} filled
          ${unresolved > 0 ? ` · ${unresolved} need${unresolved !== 1 ? '' : 's'} review` : ''}
        </span>
      </div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('neuroapply-notification-exit');
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  // ── Correction listeners ─────────────────────────────────────────────
  function attachCorrectionListeners(modal) {
    const inputs = modal.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.dataset.neuroapplyListening) return;
      input.dataset.neuroapplyListening = 'true';

      input.addEventListener('change', () => {
        if (!isContextValid()) return;
        const value = input.value?.trim();
        if (!value) return;
        if (!input.closest('[data-neuroapply-modal]')) return;

        const label = window.FieldExtractor.findLabel(input);
        if (!label) return;

        try {
          chrome.runtime.sendMessage({
            type: 'SUBMIT_FEEDBACK',
            payload: { field_label: label, corrected_value: value, platform: 'linkedin' },
          });
        } catch { /* context invalidated */ }
        console.log(`[NeuroApply] Saved answer for "${label}" → "${value}"`);
      });
    });
  }

  // ── Scan for a modal and process it (single source of truth) ─────────
  async function scan() {
    if (!isContextValid() || !(await isEnabled())) return;

    // Fast bail: no dialog in DOM → definitely not on Easy Apply
    if (!document.querySelector('[role="dialog"]')) {
      lastProcessedFields = null;
      return;
    }

    const modal = findEasyApplyModal();
    if (modal) {
      processModal(modal);
      attachCorrectionListeners(modal);
    } else {
      lastProcessedFields = null;
    }
  }

  // Schedule a one-off scan — used by enable toggle, Next clicks, init.
  function scanSoon(delay = 400) {
    setTimeout(() => { scan(); }, delay);
  }

  // ── MutationObserver (debounced) ─────────────────────────────────────
  const observer = new MutationObserver(() => {
    if (!isContextValid()) { die(); return; }
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(() => { scan(); }, 300);
  });

  function startObserver() {
    if (!_observerActive) {
      _observerActive = true;
      observer.observe(document.body, { childList: true, subtree: true });
      console.log('[NeuroApply] Active — watching for Easy Apply modals');
    }
    // Always scan on (re)start — catches a modal that's already open.
    scanSoon(400);
  }

  function stopObserver() {
    clearTimeout(_debounceTimer);
    observer.disconnect();
    _observerActive = false;
  }

  // ── Next / Continue button listener ──────────────────────────────────
  document.addEventListener('click', async (e) => {
    if (!isContextValid()) return;
    const btn = e.target.closest('button, [role="button"]');
    if (!btn) return;
    const text = (btn.textContent || btn.getAttribute('aria-label') || '').trim().toLowerCase();

    // Submit → log the application, then reset the tracking counters.
    const isSubmit = text === 'submit application' || text === 'submit';
    if (isSubmit) {
      try {
        chrome.runtime.sendMessage({
          type: 'LOG_APPLICATION',
          payload: {
            company: lastCompany,
            job_title: extractJobTitle(),
            job_url: window.location.href,
            fields_filled: lastFilledTotal,
            platform: 'linkedin',
          },
        });
        console.log(`[NeuroApply] Logged application → ${lastCompany || 'unknown'}`);
      } catch { /* context invalidated */ }
      lastCompany = null;
      lastFilledTotal = 0;
      return;
    }

    const isNavBtn = text === 'next' || text === 'continue' || text === 'review'
                  || text === 'next step' || text === 'review your application';
    if (!isNavBtn) return;

    isProcessing = false;
    lastProcessedFields = null;
    invalidateEnabledCache();
    scanSoon(900); // let LinkedIn render the next step first
  }, true);

  // ── Manual fill trigger (from popup "Fill this page" button) ─────────
  try {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type !== 'FILL_NOW') return;
      if (!isContextValid()) { sendResponse({ status: 'context_invalid' }); return true; }

      isProcessing = false;
      lastProcessedFields = null;
      invalidateEnabledCache();

      const modal = findEasyApplyModal();
      if (!modal) {
        console.log('[NeuroApply] FILL_NOW: no Easy Apply modal found on this page');
        sendResponse({ status: 'no_modal' });
        return true;
      }
      console.log('[NeuroApply] FILL_NOW triggered manually');
      processModal(modal).then(() => {
        attachCorrectionListeners(modal);
        sendResponse({ status: 'ok' });
      });
      return true;
    });
  } catch { /* context invalid */ }

  // ── Storage listener — activate/deactivate on toggle change ──────────
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !('neuroapplyEnabled' in changes)) return;
      invalidateEnabledCache();
      if (changes.neuroapplyEnabled.newValue !== false) {
        lastProcessedFields = null; // force a fresh fill after enabling
        startObserver();            // starts observer (if needed) + scans now
      } else {
        stopObserver();
        ChatWidget.close();
      }
    });
  } catch { /* context already invalid at load time */ }

  // ── Init ─────────────────────────────────────────────────────────────
  (async () => {
    if (!isContextValid()) {
      showReloadBanner();
      return;
    }

    // Heartbeat: (1) detect context invalidation even with no DOM mutations
    // so the refresh banner always appears, and (2) detect LinkedIn's SPA
    // navigation (pushState, no full reload) so the next job's modal gets
    // handled without needing a manual refresh.
    let _lastUrl = location.href;
    _heartbeat = setInterval(() => {
      if (!isContextValid()) { die(); return; }
      if (location.href !== _lastUrl) {
        _lastUrl = location.href;
        isProcessing = false;
        lastProcessedFields = null;
        lastCompany = null;
        lastFilledTotal = 0;
        scanSoon(600);
      }
    }, 1500);

    if (!(await isEnabled())) return; // Disabled — do nothing, storage listener will activate later
    startObserver();
  })();
})();
