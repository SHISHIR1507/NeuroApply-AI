/**
 * NeuroApply AI — Content Script
 * Main orchestrator: watches for Easy Apply modals, extracts fields,
 * communicates with the service worker, and triggers autofill.
 */

(() => {
  let isProcessing = false;
  let lastProcessedFields = null;

  /**
   * Find Easy Apply modal by looking for a floating container with form inputs
   * that also contains "Apply" in its text — works regardless of obfuscated class names.
   */
  function findEasyApplyModal() {
    // Strategy 1: find any input and walk up to its form container
    const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    for (const input of inputs) {
      // Walk up max 12 levels to find a sizeable overlay/modal container
      let el = input.parentElement;
      for (let i = 0; i < 12; i++) {
        if (!el) break;
        const rect = el.getBoundingClientRect();
        // Must be a visible, reasonably-sized floating panel
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

  /**
   * Process a detected modal: extract fields → resolve → autofill
   */
  async function processModal(modal) {
    if (isProcessing) return;
    isProcessing = true;

    try {
      modal.dataset.neuroapplyModal = 'true';
      console.log('[NeuroApply] 🔍 Easy Apply modal detected, extracting fields...');

      // Extract fields
      const fields = window.FieldExtractor.extractFields(modal);
      if (!fields.length) {
        console.log('[NeuroApply] No fillable fields found in modal');
        return;
      }

      // Skip if same fields as last time AND we already filled them
      const fieldSignature = fields.map(f => f.label).join('|');
      if (fieldSignature === lastProcessedFields) {
        console.log('[NeuroApply] Fields already processed, skipping');
        return;
      }

      console.log(`[NeuroApply] Found ${fields.length} fields:`, fields.map(f => f.label));

      // Send to service worker for resolution
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

      if (response && response.fields) {
        console.log(`[NeuroApply] ✅ Resolved ${response.resolved_count}/${response.total_count} fields`);

        // Only mark as processed if we actually resolved something
        if (response.resolved_count > 0) {
          lastProcessedFields = fieldSignature;
        }

        // Inject resolved values with original field metadata
        const enrichedFields = response.fields.map((resolved, i) => ({
          ...fields[i],
          ...resolved,
        }));

        // Autofill
        const result = window.Autofill.fillAll(modal, enrichedFields);
        console.log(`[NeuroApply] 📝 Filled: ${result.filled}, Unresolved: ${result.unresolved}`);

        // Show status notification
        showNotification(result.filled, result.unresolved);
      }
    } catch (err) {
      console.error('[NeuroApply] Error processing modal:', err);
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Show a subtle notification of autofill results
   */
  function showNotification(filled, unresolved) {
    // Remove existing notification
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

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      notification.classList.add('neuroapply-notification-exit');
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  /**
   * Listen for user corrections (when user manually changes a filled field)
   */
  function attachCorrectionListeners(modal) {
    const inputs = modal.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      if (input.dataset.neuroapplyListening) return;
      input.dataset.neuroapplyListening = 'true';

      input.addEventListener('change', () => {
        const value = input.value?.trim();
        if (!value) return;

        // Only save inputs that are inside the confirmed Easy Apply modal
        if (!input.closest('[data-neuroapply-modal]')) return;

        const label = window.FieldExtractor.findLabel(input);
        if (!label) return;

        chrome.runtime.sendMessage({
          type: 'SUBMIT_FEEDBACK',
          payload: {
            field_label: label,
            corrected_value: value,
            platform: 'linkedin',
          },
        });
        console.log(`[NeuroApply] 💾 Saved answer for "${label}" → "${value}"`);
      });
    });
  }

  /**
   * Check if autofill is enabled via the popup toggle.
   */
  async function isEnabled() {
    const { neuroapplyEnabled } = await chrome.storage.local.get('neuroapplyEnabled');
    return neuroapplyEnabled !== false; // ON by default unless explicitly turned off
  }

  /**
   * MutationObserver — watch for Easy Apply modal changes.
   * Only fires when the toggle is ON.
   */
  const observer = new MutationObserver(async () => {
    if (!(await isEnabled())) return;

    const modal = findEasyApplyModal();
    if (modal) {
      setTimeout(() => {
        processModal(modal);
        attachCorrectionListeners(modal);
      }, 500);
    } else {
      lastProcessedFields = null;
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Check on page load too
  setTimeout(async () => {
    if (!(await isEnabled())) return;
    const modal = findEasyApplyModal();
    if (modal) {
      processModal(modal);
      attachCorrectionListeners(modal);
    }
  }, 2000);

  console.log('[NeuroApply] 🚀 Content script loaded — watching for Easy Apply modals');
})();
