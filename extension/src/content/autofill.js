/**
 * NeuroApply AI — Autofill Engine
 * Fills form fields with resolved values, dispatching proper React-compatible events.
 * 
 * Key challenge: LinkedIn uses React, so we must dispatch synthetic events
 * that React's event system recognizes, not just set .value.
 */

const Autofill = (() => {
  /**
   * Set a text/number input value with proper React event dispatching
   */
  function fillTextInput(input, value) {
    // React stores value in a special property descriptor
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;

    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    const setter = input.tagName === 'TEXTAREA' 
      ? nativeTextAreaValueSetter 
      : nativeInputValueSetter;

    if (setter) {
      setter.call(input, value);
    } else {
      input.value = value;
    }

    // Dispatch events that React listens for
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Select a dropdown option
   */
  function fillSelect(select, value) {
    // Try exact value match first
    let option = Array.from(select.options).find(o => o.value === value);
    
    // Fallback: case-insensitive text match
    if (!option) {
      option = Array.from(select.options).find(
        o => o.textContent.trim().toLowerCase() === value.toLowerCase()
      );
    }

    // Fallback: partial match
    if (!option) {
      option = Array.from(select.options).find(
        o => o.textContent.trim().toLowerCase().includes(value.toLowerCase()) ||
             value.toLowerCase().includes(o.textContent.trim().toLowerCase())
      );
    }

    if (option) {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  /**
   * Select a radio button
   */
  function fillRadio(radioName, value, container) {
    const radios = container.querySelectorAll(`input[type="radio"][name="${radioName}"]`);
    for (const radio of radios) {
      const label = radio.nextElementSibling?.textContent?.trim() || radio.value;
      if (
        radio.value === value ||
        label.toLowerCase() === value.toLowerCase() ||
        label.toLowerCase().includes(value.toLowerCase())
      ) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        radio.click();
        return true;
      }
    }
    return false;
  }

  /**
   * Fill a single field based on its type
   */
  function fillField(container, field, value) {
    if (!value) return false;

    try {
      // Find the input element
      let input;

      if (field.type === 'radio' && field.element) {
        return fillRadio(field.element, value, container);
      }

      // Try to find by label association
      const allInputs = container.querySelectorAll('input, select, textarea');
      for (const el of allInputs) {
        const label = window.FieldExtractor?.findLabel(el);
        if (label && label.toLowerCase().trim() === field.label.toLowerCase().trim()) {
          input = el;
          break;
        }
      }

      if (!input) return false;

      switch (field.type) {
        case 'text':
        case 'number':
        case 'textarea':
          fillTextInput(input, value);
          markFilled(input);
          return true;

        case 'select':
          const filled = fillSelect(input, value);
          if (filled) markFilled(input);
          return filled;

        case 'checkbox':
          const shouldCheck = ['yes', 'true', '1'].includes(value.toLowerCase());
          if (input.checked !== shouldCheck) {
            input.click();
          }
          markFilled(input);
          return true;

        default:
          fillTextInput(input, value);
          markFilled(input);
          return true;
      }
    } catch (err) {
      console.error(`[NeuroApply] Error filling field "${field.label}":`, err);
      return false;
    }
  }

  /**
   * Add visual indicator to a filled field
   */
  function markFilled(input) {
    input.classList.add('neuroapply-filled');
    // Remove after animation completes
    setTimeout(() => input.classList.remove('neuroapply-filling'), 600);
    input.classList.add('neuroapply-filling');
  }

  /**
   * Mark a field as unresolved (needs user input)
   */
  function markUnresolved(container, field) {
    const allInputs = container.querySelectorAll('input, select, textarea');
    for (const el of allInputs) {
      const label = window.FieldExtractor?.findLabel(el);
      if (label && label.toLowerCase().trim() === field.label.toLowerCase().trim()) {
        el.classList.add('neuroapply-unresolved');
        break;
      }
    }
  }

  /**
   * Fill multiple fields in a container
   * Returns { filled: number, unresolved: number }
   */
  function fillAll(container, resolvedFields) {
    let filled = 0;
    let unresolved = 0;

    for (const field of resolvedFields) {
      if (field.value) {
        const success = fillField(container, field, field.value);
        if (success) filled++;
        else unresolved++;
      } else {
        markUnresolved(container, field);
        unresolved++;
      }
    }

    return { filled, unresolved };
  }

  return { fillField, fillAll, markFilled, markUnresolved };
})();

if (typeof window !== 'undefined') {
  window.Autofill = Autofill;
}
