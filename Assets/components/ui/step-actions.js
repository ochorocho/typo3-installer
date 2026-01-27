import { LitElement, html, css } from 'lit';
import { hostStyles, buttonStyles, emit } from './shared-styles.js';
import './spinner.js';

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

  _handleContinueClick() {
    if (!this.canContinue || this.loading) {
      // Emit event to highlight invalid steps when clicking disabled button
      emit(this, 'validation-failed');
      return;
    }
    emit(this, 'next-step');
  }

  render() {
    const btnClass = this.continueVariant === 'success' ? 'btn-success' : 'btn-primary';
    const isDisabled = !this.canContinue || this.loading;
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
          @click=${this._handleContinueClick}
          ?disabled=${isDisabled}
        >
          ${this.loading ? html`<ui-spinner size="small">${this.continueText}</ui-spinner>` : html`${this.continueText}`}
        </button>
      </div>
    `;
  }
}

customElements.define('t3-step-actions', StepActions);
