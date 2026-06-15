/**
 * NeuroApply AI — Content Script
 */

(() => {
  let isProcessing = false;
  let lastProcessedFields = null;
  let _debounceTimer = null;
  let _observerActive = false;

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
  function showReloadBanner() {
    if (document.querySelector('.neuroapply-reload-banner')) return;
    const banner = document.createElement('div');
    banner.className = 'neuroapply-reload-banner';
    banner.innerHTML = '⚠ <strong>NeuroApply</strong> was updated — <u style="cursor:pointer">click here to reload the page</u> and re-enable autofill.';
    Object.assign(banner.style, {
      position: 'fixed',
      bottom: '72px',
      right: '16px',
      background: '#1e1b4b',
      color: '#e0e7ff',
      padding: '12px 16px',
      borderRadius: '10px',
      fontSize: '13px',
      lineHeight: '1.5',
      zIndex: '2147483647',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      border: '1px solid rgba(129,140,248,0.4)',
      cursor: 'pointer',
      maxWidth: '280px',
    });
    banner.onclick = () => location.reload();
    document.body.appendChild(banner);
  }

  // ── Modal detection ──────────────────────────────────────────────────
  function findEasyApplyModal() {
    // Fast path: LinkedIn wraps Easy Apply in an ARIA dialog
    const dialogs = document.querySelectorAll('[role="dialog"]');
    for (const dialog of dialogs) {
      const rect = dialog.getBoundingClientRect();
      if (rect.width < 200 || rect.height < 150 || rect.top < 0) continue;
      if (!dialog.querySelector('input:not([type="hidden"]), select, textarea')) continue;
      const text = dialog.textContent || '';
      if (
        text.includes('Easy Apply') ||
        text.includes('Apply') ||
        text.includes('application') ||
        text.includes('resume') ||
        text.includes('Resume')
      ) {
        return dialog;
      }
    }

    // Fallback: walk up from inputs
    const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    for (const input of inputs) {
      let el = input.parentElement;
      for (let i = 0; i < 12; i++) {
        if (!el) break;
        const rect = el.getBoundingClientRect();
        if (rect.width > 300 && rect.height > 200 && rect.top >= 0) {
          const text = el.innerText || '';
          if (
            text.includes('Apply') ||
            text.includes('application') ||
            text.includes('resume') ||
            text.includes('Resume')
          ) {
            return el;
          }
        }
        el = el.parentElement;
      }
    }
    return null;
  }

  // ── Modal processing ─────────────────────────────────────────────────
  async function processModal(modal) {
    if (isProcessing) return;
    isProcessing = true;

    try {
      modal.dataset.neuroapplyModal = 'true';
      console.log('[NeuroApply] Easy Apply modal detected, extracting fields...');

      const fields = window.FieldExtractor.extractFields(modal);
      if (!fields.length) {
        console.log('[NeuroApply] No fillable fields found in modal');
        return;
      }

      const fieldSignature = fields.map(f => f.label).join('|');
      if (fieldSignature === lastProcessedFields) {
        console.log('[NeuroApply] Fields already processed, skipping');
        return;
      }

      console.log(`[NeuroApply] Found ${fields.length} fields:`, fields.map(f => f.label));

      if (!isContextValid()) return;

      const response = await chrome.runtime.sendMessage({
        type: 'RESOLVE_FIELDS',
        payload: {
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
        },
      });

      if (response?.error) {
        console.error(`[NeuroApply] Backend error: ${response.error} — ${response.message}`);
        return;
      }

      if (response && response.fields) {
        console.log(`[NeuroApply] Resolved ${response.resolved_count}/${response.total_count} fields`);
        console.log('[NeuroApply] Field values:', response.fields.map(f => `${f.label}: ${f.value ?? '(none)'}`));

        if (response.resolved_count > 0) {
          lastProcessedFields = fieldSignature;
        }

        const enrichedFields = response.fields.map((resolved, i) => ({
          ...fields[i],
          ...resolved,
        }));

        const result = window.Autofill.fillAll(modal, enrichedFields);
        console.log(`[NeuroApply] Filled: ${result.filled}, Unresolved: ${result.unresolved}`);

        showNotification(result.filled, result.unresolved);
      } else {
        console.warn('[NeuroApply] Unexpected response from background:', response);
      }
    } catch (err) {
      console.error('[NeuroApply] Error processing modal:', err);
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

  // ── MutationObserver (debounced) ─────────────────────────────────────
  const observer = new MutationObserver(() => {
    if (!isContextValid()) {
      observer.disconnect();
      _observerActive = false;
      showReloadBanner();
      return;
    }

    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(async () => {
      const enabled = await isEnabled();
      if (!enabled) return;

      const modal = findEasyApplyModal();
      if (modal) {
        processModal(modal);
        attachCorrectionListeners(modal);
      } else {
        lastProcessedFields = null;
      }
    }, 300);
  });

  function startObserver() {
    if (_observerActive) return;
    _observerActive = true;
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[NeuroApply] Active — watching for Easy Apply modals');

    // Initial check
    setTimeout(async () => {
      if (!isContextValid() || !(await isEnabled())) return;
      const modal = findEasyApplyModal();
      if (modal) {
        processModal(modal);
        attachCorrectionListeners(modal);
      }
    }, 2000);
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
    const isNavBtn = text === 'next' || text === 'continue' || text === 'review'
                  || text === 'next step' || text === 'review your application';
    if (!isNavBtn) return;

    isProcessing = false;
    lastProcessedFields = null;
    invalidateEnabledCache();

    setTimeout(async () => {
      if (!(await isEnabled())) return;
      const modal = findEasyApplyModal();
      if (modal) {
        processModal(modal);
        attachCorrectionListeners(modal);
      }
    }, 900);
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
        startObserver();
      } else {
        stopObserver();
      }
    });
  } catch { /* context already invalid at load time */ }

  // ── Init ─────────────────────────────────────────────────────────────
  (async () => {
    if (!isContextValid()) {
      showReloadBanner();
      return;
    }
    if (!(await isEnabled())) return; // Disabled — do nothing, storage listener will activate later
    startObserver();
  })();
})();
