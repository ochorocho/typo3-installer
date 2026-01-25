import { LitElement, html, css } from 'lit';
import { buttonStyles, spinnerStyles } from './shared-styles.js';

/**
 * Reusable step navigation actions (Back/Continue buttons).
 *
 * @element t3-step-actions
 * @fires previous-step - Dispatched when Back button is clicked
 * @fires next-step - Dispatched when Continue button is clicked
 *
 * @prop {Boolean} showBack - Whether to show the Back button (default: true)
 * @prop {Boolean} canContinue - Whether Continue button is enabled
 * @prop {Boolean} loading - Shows spinner in Continue button when true
 * @prop {String} continueText - Text for Continue button (default: "Continue")
 * @prop {String} continueVariant - Button variant: "primary", "success" (default: "primary")
 * @slot left - Additional content in the left actions area
 */
export class StepActions extends LitElement {
  static properties = {
    showBack: { type: Boolean, attribute: 'show-back' },
    canContinue: { type: Boolean, attribute: 'can-continue' },
    loading: { type: Boolean },
    continueText: { type: String, attribute: 'continue-text' },
    continueVariant: { type: String, attribute: 'continue-variant' }
  };

  static styles = [
    buttonStyles,
    spinnerStyles,
    css`
      :host {
        display: block;
        margin-top: var(--spacing-lg, 24px);
      }

      .actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--spacing-md, 16px);
      }

      .actions-left {
        display: flex;
        gap: var(--spacing-md, 16px);
      }
    `
  ];

  constructor() {
    super();
    this.showBack = true;
    this.canContinue = true;
    this.loading = false;
    this.continueText = 'Continue';
    this.continueVariant = 'primary';
  }

  _handlePrevious() {
    this.dispatchEvent(new CustomEvent('previous-step', { bubbles: true, composed: true }));
  }

  _handleNext() {
    this.dispatchEvent(new CustomEvent('next-step', { bubbles: true, composed: true }));
  }

  render() {
    const btnClass = this.continueVariant === 'success' ? 'btn-success' : 'btn-primary';

    return html`
      <div class="actions">
        <div class="actions-left">
          ${this.showBack ? html`
            <button class="btn-outline" @click=${this._handlePrevious}>Back</button>
          ` : ''}
          <slot name="left"></slot>
        </div>
        <button
          class="${btnClass}"
          @click=${this._handleNext}
          ?disabled=${!this.canContinue || this.loading}
        >
          ${this.loading ? html`<span class="spinner"></span>` : ''}
          ${this.continueText}
        </button>
      </div>
    `;
  }
}

customElements.define('t3-step-actions', StepActions);
