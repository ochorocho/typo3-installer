import { LitElement, html, css } from 'lit';
import { hostStyles, alertStyles } from './shared-styles.js';
import './t3-icon.js';
import './error-help.js';

/**
 * Unified error display component with 3-part structure:
 * 1. Error message (mandatory)
 * 2. Technical details in collapsible element (optional)
 * 3. Contextual help suggestions (optional)
 *
 * @element t3-section-error
 * @prop {String} title - Error title (required)
 * @prop {String} message - Error message (required)
 * @prop {String} details - Stack trace / technical details (optional)
 * @prop {String} context - Help context: 'database', 'requirements', 'installation', 'general' (optional)
 */
export class SectionError extends LitElement {
  static properties = {
    title: { type: String },
    message: { type: String },
    details: { type: String },
    context: { type: String }
  };

  static styles = [
    hostStyles,
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
        margin: 0 0 var(--spacing-sm, 8px) 0;
      }

      /* Collapsible details styling */
      details {
        margin-top: var(--spacing-md, 16px);
        background: var(--color-bg-white, #fff);
        border-radius: var(--border-radius, 4px);
        border: 1px solid rgba(200, 60, 60, 0.2);
      }
      summary {
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: var(--color-text-light, #333333);
        user-select: none;
      }
      summary:hover {
        background: rgba(200, 60, 60, 0.05);
      }
      summary:focus-visible {
        outline: 2px solid var(--color-primary, #ff8700);
        outline-offset: -2px;
      }
      .details-content {
        padding: var(--spacing-md, 16px);
        padding-top: 0;
        font-size: 12px;
        font-family: monospace;
        color: var(--color-text, #333);
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }
    `
  ];

  constructor() {
    super();
    this.title = 'Error';
    this.message = '';
    this.details = '';
    this.context = '';
  }

  render() {
    return html`
      <div class="alert alert-error" role="alert">
        <div class="error-header">
          <t3-icon identifier="actions-exclamation-circle" size="medium"></t3-icon>
          <span class="error-title">${this.title}</span>
        </div>
        <p class="error-message">${this.message}</p>
        ${this.details ? html`
          <details>
            <summary>Technical details</summary>
            <div class="details-content">${this.details}</div>
          </details>
        ` : ''}
        ${this.context ? html`
          <t3-error-help .error=${{ message: this.message, details: this.details }} context=${this.context}></t3-error-help>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('t3-section-error', SectionError);
