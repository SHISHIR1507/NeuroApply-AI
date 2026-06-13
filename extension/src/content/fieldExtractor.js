/**
 * NeuroApply AI — Field Extractor
 * Extracts form fields from LinkedIn Easy Apply modals using label-based matching.
 * 
 * Strategy: Match on label text (semantically stable) rather than CSS class names
 * (which LinkedIn changes frequently).
 */

const FieldExtractor = (() => {
  /**
   * Find the associated label text for an input element.
   * Tries multiple strategies in order of reliability.
   */
  function findLabel(input) {
    // Strategy 1: aria-label attribute
    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    // Strategy 2: Explicit <label> via for/id
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label && label.textContent.trim()) return label.textContent.trim();
    }

    // Strategy 3: Walk up DOM to find parent with label-like element
    let parent = input.parentElement;
    for (let i = 0; i < 5 && parent; i++) {
      // Check for label elements
      const label = parent.querySelector('label');
      if (label && label.textContent.trim()) return label.textContent.trim();

      // Check for span with label role (LinkedIn uses this pattern)
      const spans = parent.querySelectorAll('span.artdeco-text-input--label, span[data-test-form-element-label]');
      if (spans.length) return spans[0].textContent.trim();

      // Check for any text-bearing element that looks like a label
      const legend = parent.querySelector('legend, .fb-dash-form-element__label, .jobs-easy-apply-form-element__label');
      if (legend && legend.textContent.trim()) return legend.textContent.trim();

      parent = parent.parentElement;
    }

    // Strategy 4: Placeholder text
    const placeholder = input.getAttribute('placeholder');
    if (placeholder && placeholder.trim()) return placeholder.trim();

    // Strategy 5: Name attribute as last resort
    const name = input.getAttribute('name');
    if (name) return name.replace(/[-_]/g, ' ').trim();

    return null;
  }

  /**
   * Extract dropdown/select options
   */
  function extractOptions(element) {
    if (element.tagName === 'SELECT') {
      return Array.from(element.options)
        .filter(o => o.value)
        .map(o => ({ value: o.value, text: o.textContent.trim() }));
    }

    // LinkedIn often uses custom dropdowns with listbox role
    const parent = element.closest('[data-test-form-element]') || element.parentElement;
    if (parent) {
      const options = parent.querySelectorAll('[role="option"], li[data-test-form-element-option]');
      if (options.length) {
        return Array.from(options).map(o => ({
          value: o.getAttribute('data-value') || o.textContent.trim(),
          text: o.textContent.trim(),
        }));
      }
    }
    return null;
  }

  /**
   * Determine the semantic type of a field
   */
  function getFieldType(element) {
    if (element.tagName === 'SELECT') return 'select';
    if (element.tagName === 'TEXTAREA') return 'textarea';
    if (element.type === 'radio') return 'radio';
    if (element.type === 'checkbox') return 'checkbox';
    if (element.type === 'number') return 'number';
    if (element.type === 'file') return 'file';
    return 'text';
  }

  /**
   * Generate a stable ID for a field based on label + type
   */
  function generateFieldId(label, type, index) {
    const base = (label || `field_${index}`).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    return `${base}_${type}_${index}`;
  }

  /**
   * Extract all form fields from a container (e.g., Easy Apply modal)
   */
  function extractFields(container) {
    const fields = [];
    const inputs = container.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
    );

    inputs.forEach((input, index) => {
      // Skip hidden or invisible elements
      if (input.offsetParent === null && input.type !== 'radio') return;

      const label = findLabel(input);
      if (!label) return; // Skip unlabelled fields

      const type = getFieldType(input);
      const options = extractOptions(input);

      // For radio buttons, group by name and only add once
      if (type === 'radio') {
        const existing = fields.find(f => f.label === label && f.type === 'radio');
        if (existing) {
          // Add this option to the existing radio group
          if (existing.options) {
            existing.options.push({
              value: input.value,
              text: input.nextElementSibling?.textContent?.trim() || input.value,
              checked: input.checked,
            });
          }
          return;
        }
        // First radio in group
        fields.push({
          id: generateFieldId(label, type, index),
          label: label,
          type: type,
          required: input.required || input.closest('[required]') !== null,
          options: [{
            value: input.value,
            text: input.nextElementSibling?.textContent?.trim() || input.value,
            checked: input.checked,
          }],
          currentValue: input.checked ? input.value : null,
          element: input.name, // Store name for radio group targeting
        });
        return;
      }

      fields.push({
        id: generateFieldId(label, type, index),
        label: label,
        type: type,
        required: input.required,
        options: options,
        currentValue: input.value || null,
        element: null, // Will be resolved by autofill using the id
      });
    });

    return fields;
  }

  // Public API
  return { extractFields, findLabel };
})();

// Make available to content.js
if (typeof window !== 'undefined') {
  window.FieldExtractor = FieldExtractor;
}
