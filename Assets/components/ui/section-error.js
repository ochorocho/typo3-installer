import { LitElement, html, css } from 'lit';
import { hostStyles, buttonStyles, alertStyles, emit } from './shared-styles.js';
import './t3-icon.js';

/**
 * Reusable section error component with retry functionality.
 * @element t3-section-error
 * @fires retry - Dispatched when retry button is clicked
 */
export class SectionError extends LitElement {
  static properties = {
    title: { type: String },
    message: { type: String }
  };

  static styles = [
    hostStyles,
    buttonStyles,
    alertStyles,
    css`
      .error-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-sm, 8px);
      }
      .error-header t3-icon { color: var(--color-error, #c83c3c); }
      .error-title {
        font-weight: 600;
        color: var(--color-error, #c83c3c);
      }
      .error-message {
        color: var(--color-text, #333);
        margin-bottom: var(--spacing-sm, 8px);
      }
    `
  ];

  constructor() {
    super();
    this.title = 'Error';
    this.message = '';
  }

  render() {
    return html`
      <div class="alert alert-error" role="alert">
        <div class="error-header">
          <t3-icon identifier="actions-exclamation-circle" size="medium"></t3-icon>
          <span class="error-title">${this.title}</span>
        </div>
        <p class="error-message">${this.message}</p>
        <button class="btn-error" @click=${() => emit(this, 'retry')}>Retry</button>
      </div>
    `;
  }
}

customElements.define('t3-section-error', SectionError);
