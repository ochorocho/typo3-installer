import { LitElement, html, css } from 'lit';
import { hostStyles, buttonStyles, spinnerStyles, emit } from './shared-styles.js';

/**
 * Reusable step navigation actions (Back/Continue buttons).
 * @element t3-step-actions
 * @fires previous-step - When Back button is clicked
 * @fires next-step - When Continue button is clicked
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
    hostStyles,
    buttonStyles,
    spinnerStyles,
    css`
      :host { margin-top: var(--spacing-lg, 24px); }
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

  render() {
    const btnClass = this.continueVariant === 'success' ? 'btn-success' : 'btn-primary';
    return html`
      <div class="actions">
        <div class="actions-left">
          ${this.showBack ? html`
            <button class="btn-outline" @click=${() => emit(this, 'previous-step')}>Back</button>
          ` : ''}
          <slot name="left"></slot>
        </div>
        <button
          class="${btnClass}"
          @click=${() => emit(this, 'next-step')}
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
