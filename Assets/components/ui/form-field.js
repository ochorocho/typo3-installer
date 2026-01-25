import { LitElement, html, css } from 'lit';
import { formStyles } from './shared-styles.js';

/**
 * Reusable form field component with label, input, and help/error text.
 *
 * @element t3-form-field
 * @fires input-change - Dispatched when input value changes, detail: { value }
 * @fires field-blur - Dispatched when input loses focus
 *
 * @prop {String} label - Field label text
 * @prop {String} name - Field name/id
 * @prop {String} type - Input type (text, password, email, etc.)
 * @prop {String} value - Current input value
 * @prop {String} placeholder - Input placeholder
 * @prop {String} helpText - Help text shown below input
 * @prop {String} errorText - Error message (shown instead of help when present)
 * @prop {Boolean} touched - Whether field has been touched/blurred
 * @prop {String} autocomplete - Autocomplete attribute value
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
    formStyles,
    css`
      :host {
        display: block;
        margin-bottom: var(--spacing-md, 16px);
      }
    `
  ];

  constructor() {
    super();
    this.label = '';
    this.name = '';
    this.type = 'text';
    this.value = '';
    this.placeholder = '';
    this.helpText = '';
    this.errorText = '';
    this.touched = false;
    this.autocomplete = '';
  }

  _handleInput(e) {
    this.dispatchEvent(new CustomEvent('input-change', {
      bubbles: true,
      composed: true,
      detail: { value: e.target.value }
    }));
  }

  _handleBlur() {
    this.dispatchEvent(new CustomEvent('field-blur', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    const hasError = this.touched && this.errorText;
    const helpId = `help-${this.name}`;
    const errorId = `error-${this.name}`;

    return html`
      <label for=${this.name}>${this.label}</label>
      <input
        type=${this.type}
        id=${this.name}
        name=${this.name}
        .value=${this.value}
        placeholder=${this.placeholder}
        autocomplete=${this.autocomplete || ''}
        class=${hasError ? 'error' : ''}
        aria-invalid=${hasError ? 'true' : 'false'}
        aria-describedby=${hasError ? errorId : helpId}
        @input=${this._handleInput}
        @blur=${this._handleBlur}
      >
      ${hasError ? html`
        <div id=${errorId} class="error-text" role="alert">${this.errorText}</div>
      ` : this.helpText ? html`
        <div id=${helpId} class="help-text">${this.helpText}</div>
      ` : ''}
    `;
  }
}

customElements.define('t3-form-field', FormField);
