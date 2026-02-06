import { LitElement, html } from 'lit';
import './t3-icon.js';
import './error-help.js';

/**
 * Unified error display component with 3-part structure.
 * Uses global CSS from main.css (no Shadow DOM).
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
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    title: { type: String },
    message: { type: String },
    details: { type: String },
    context: { type: String }
  };

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
