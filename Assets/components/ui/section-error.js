import { LitElement, html, css } from 'lit';
import { buttonStyles } from './shared-styles.js';

/**
 * Reusable section error component for displaying errors with retry functionality.
 *
 * @element t3-section-error
 * @fires retry - Dispatched when retry button is clicked
 *
 * @prop {String} title - Error title (e.g., "Failed to Load Packages")
 * @prop {String} message - Error message to display
 */
export class SectionError extends LitElement {
  static properties = {
    title: { type: String },
    message: { type: String }
  };

  static styles = [
    buttonStyles,
    css`
      :host {
        display: block;
      }

      .section-error {
        background: var(--color-error-bg, #ffebee);
        border: 1px solid var(--color-error, #c83c3c);
        padding: var(--spacing-md, 16px);
        border-radius: var(--border-radius, 4px);
      }

      .section-error-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-sm, 8px);
      }

      .section-error-icon {
        width: 20px;
        height: 20px;
        color: var(--color-error, #c83c3c);
        flex-shrink: 0;
      }

      .section-error-title {
        font-weight: 600;
        color: var(--color-error, #c83c3c);
        font-size: 14px;
      }

      .section-error-message {
        color: #333;
        font-size: 14px;
        margin-bottom: var(--spacing-sm, 8px);
      }
    `
  ];

  constructor() {
    super();
    this.title = 'Error';
    this.message = '';
  }

  _handleRetry() {
    this.dispatchEvent(new CustomEvent('retry', { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <div class="section-error" role="alert">
        <div class="section-error-header">
          <svg class="section-error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span class="section-error-title">${this.title}</span>
        </div>
        <p class="section-error-message">${this.message}</p>
        <button class="btn-error" @click=${this._handleRetry}>Retry</button>
      </div>
    `;
  }
}

customElements.define('t3-section-error', SectionError);
