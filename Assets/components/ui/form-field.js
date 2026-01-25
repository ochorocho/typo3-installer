import { LitElement, html, css } from 'lit';
import { hostStyles, formStyles, emit } from './shared-styles.js';

/**
 * Reusable form field with label, input, and help/error text.
 * @element t3-form-field
 * @fires input-change - When input value changes, detail: { value }
 * @fires field-blur - When input loses focus
 */
export class FormField extends LitElement {
  static properties = {
    label: { type: String },
    name: { type: String },
    type: { type: String },
    value: { type: String },
    placeholder: { type: String },
    helpText: { type: String, attribute: 'help-text' },
    errorText: { type: String, attribute: 'error-text' },
    touched: { type: Boolean },
    autocomplete: { type: String }
  };

  static styles = [
    hostStyles,
    formStyles,
    css`:host { margin-bottom: var(--spacing-md, 16px); }`
  ];

  constructor() {
    super();
    this.type = 'text';
    this.value = '';
  }

  render() {
    const hasError = this.touched && this.errorText;
    const descId = `${this.name}-desc`;

    return html`
      <label for=${this.name}>${this.label}</label>
      <input
        type=${this.type}
        id=${this.name}
        name=${this.name}
        .value=${this.value}
        placeholder=${this.placeholder || ''}
        autocomplete=${this.autocomplete || ''}
        class=${hasError ? 'error' : ''}
        aria-invalid=${hasError ? 'true' : 'false'}
        aria-describedby=${descId}
        @input=${e => emit(this, 'input-change', { value: e.target.value })}
        @blur=${() => emit(this, 'field-blur')}
      >
      ${hasError ? html`
        <div id=${descId} class="error-text" role="alert">${this.errorText}</div>
      ` : this.helpText ? html`
        <div id=${descId} class="help-text">${this.helpText}</div>
      ` : ''}
    `;
  }
}

customElements.define('t3-form-field', FormField);
