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
   * Find the question-level label for a radio button group.
   * Radio inputs are nested inside per-option <label>s, so findLabel() returns
   * the option text ("Yes"/"No"). We need to go higher to find the question.
   */
  function findRadioGroupLabel(input) {
    // <fieldset> → <legend> is the standard pattern
    const fieldset = input.closest('fieldset');
    if (fieldset) {
      const legend = fieldset.querySelector('legend');
      if (legend?.textContent.trim()) return legend.textContent.trim();
    }
    // LinkedIn sometimes uses div wrappers with a label-like span/div
    let parent = input.parentElement;
    for (let i = 0; i < 8 && parent; i++) {
      const legend = parent.querySelector('legend');
      if (legend?.textContent.trim()) return legend.textContent.trim();
      const ql = parent.querySelector(
        '.fb-dash-form-element__label, .jobs-easy-apply-form-element__label, [data-test-form-element-label]'
      );
      if (ql?.textContent.trim()) return ql.textContent.trim();
      parent = parent.parentElement;
    }
    return null;
  }

  /**
   * Get the visible text label of a single radio option.
   * Prefers the wrapping <label> element over nextElementSibling.
   */
  function radioOptionText(input) {
    const wrappingLabel = input.closest('label');
    if (wrappingLabel) return wrappingLabel.textContent.trim();
    const sibling = input.nextElementSibling;
    if (sibling?.textContent.trim()) return sibling.textContent.trim();
    return input.value;
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

      // For radio buttons, group by input.name (all options share the same name).
      // Do NOT group by label — findLabel() returns the per-option text ("Yes"/"No"),
      // not the question text, so every option would appear as a separate field.
      if (type === 'radio') {
        const radioName = input.name;
        const optText = radioOptionText(input);
        const existing = fields.find(f => f.element === radioName && f.type === 'radio');
        if (existing) {
          existing.options.push({ value: input.value, text: optText, checked: input.checked });
          if (input.checked) existing.currentValue = input.value;
          return;
        }
        // First radio in this group — use the question-level label
        const groupLabel = findRadioGroupLabel(input) || label;
        fields.push({
          id: generateFieldId(groupLabel, type, index),
          label: groupLabel,
          type: type,
          required: input.required || input.closest('[required]') !== null,
          options: [{ value: input.value, text: optText, checked: input.checked }],
          currentValue: input.checked ? input.value : null,
          element: radioName,
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
  return { extractFields, findLabel, findRadioGroupLabel };
})();

// Make available to content.js
if (typeof window !== 'undefined') {
  window.FieldExtractor = FieldExtractor;
}
