import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';

export class StepRequirements extends LitElement {
  static properties = {
    state: { type: Object },
    checking: { type: Boolean },
    requirements: { type: Array }
  };

  static styles = css`
    :host {
      display: block;
    }

    h2 {
      margin: 0 0 var(--spacing-md, 16px) 0;
      color: var(--color-secondary, #1a1a1a);
    }

    p {
      color: var(--color-text-light, #666);
      margin-bottom: var(--spacing-lg, 24px);
    }

    .requirements-list {
      margin-bottom: var(--spacing-lg, 24px);
    }

    .requirement {
      display: flex;
      align-items: flex-start;
      padding: var(--spacing-md, 16px);
      border: 1px solid var(--color-border, #ddd);
      border-radius: var(--border-radius, 4px);
      margin-bottom: var(--spacing-sm, 8px);
      background: white;
    }

    .requirement.passed {
      border-left: 4px solid var(--color-success, #4caf50);
    }

    .requirement.failed {
      border-left: 4px solid var(--color-error, #f44336);
    }

    .requirement.warning {
      border-left: 4px solid var(--color-warning, #ff9800);
    }

    .requirement-icon {
      width: 24px;
      height: 24px;
      margin-right: var(--spacing-md, 16px);
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .requirement.passed .requirement-icon {
      color: var(--color-success, #4caf50);
    }

    .requirement.failed .requirement-icon {
      color: var(--color-error, #f44336);
    }

    .requirement.warning .requirement-icon {
      color: var(--color-warning, #ff9800);
    }

    .requirement-content {
      flex: 1;
    }

    .requirement-title {
      font-weight: 600;
      margin-bottom: var(--spacing-xs, 4px);
    }

    .requirement-description {
      font-size: 14px;
      color: var(--color-text-light, #666);
    }

    .summary {
      display: flex;
      gap: var(--spacing-lg, 24px);
      padding: var(--spacing-md, 16px);
      background: var(--color-bg, #f5f5f5);
      border-radius: var(--border-radius, 4px);
      margin-bottom: var(--spacing-lg, 24px);
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm, 8px);
    }

    .summary-count {
      font-weight: 600;
      font-size: 1.25rem;
    }

    .summary-count.passed {
      color: var(--color-success, #4caf50);
    }

    .summary-count.failed {
      color: var(--color-error, #f44336);
    }

    .summary-count.warning {
      color: var(--color-warning, #ff9800);
    }

    .packages-info {
      font-size: 14px;
      color: var(--color-text-light, #666);
      background: var(--color-bg, #f5f5f5);
      padding: var(--spacing-md, 16px);
      border-radius: var(--border-radius, 4px);
      margin-bottom: var(--spacing-lg, 24px);
    }

    .packages-info strong {
      color: var(--color-secondary, #1a1a1a);
    }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--color-border, #ddd);
      color: var(--color-text, #333);
    }

    .btn-outline:hover:not(:disabled) {
      background: var(--color-bg, #f5f5f5);
    }

    .actions-left {
      display: flex;
      gap: var(--spacing-md, 16px);
    }

    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md, 16px);
    }

    button {
      padding: var(--spacing-sm, 8px) var(--spacing-lg, 24px);
      border: none;
      border-radius: var(--border-radius, 4px);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--color-primary, #ff8700);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #e67a00;
    }

    .btn-secondary {
      background: var(--color-info, #2196f3);
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #1976d2;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
      margin-right: var(--spacing-sm, 8px);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  constructor() {
    super();
    this.checking = false;
    this.requirements = [];
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.state?.requirements?.checked) {
      this._checkRequirements();
    } else {
      this.requirements = this.state.requirements.results;
    }
  }

  async _checkRequirements() {
    this.checking = true;
    try {
      // Use dynamic validation based on selected packages and TYPO3 version
      const selectedPackages = this.state?.packages?.selected || [];
      const typo3Version = this.state?.typo3Version || '13.4';
      const response = await apiClient.validateRequirements(selectedPackages, typo3Version);
      this.requirements = response.requirements || [];

      const passed = response.passed;

      this.dispatchEvent(new CustomEvent('state-update', {
        bubbles: true,
        composed: true,
        detail: {
          requirements: {
            checked: true,
            passed,
            results: this.requirements
          },
          packages: {
            ...this.state.packages,
            validated: true
          }
        }
      }));
    } catch (error) {
      console.error('Failed to check requirements:', error);
    } finally {
      this.checking = false;
    }
  }

  _handlePrevious() {
    this.dispatchEvent(new CustomEvent('previous-step', { bubbles: true, composed: true }));
  }

  _getStatusIcon(status) {
    switch (status) {
      case 'passed': return '\u2713';
      case 'failed': return '\u2717';
      case 'warning': return '\u26A0';
      default: return '?';
    }
  }

  _getSummary() {
    const passed = this.requirements.filter(r => r.status === 'passed').length;
    const failed = this.requirements.filter(r => r.status === 'failed').length;
    const warning = this.requirements.filter(r => r.status === 'warning').length;
    return { passed, failed, warning };
  }

  _canProceed() {
    return this.state?.requirements?.passed && !this.checking;
  }

  _handleNext() {
    this.dispatchEvent(new CustomEvent('next-step', { bubbles: true, composed: true }));
  }

  render() {
    const summary = this._getSummary();
    const selectedPackages = this.state?.packages?.selected || [];

    return html`
      <h2>System Requirements</h2>
      <p>Checking if your server meets the requirements for the selected TYPO3 packages.</p>

      <div class="packages-info">
        <strong>${selectedPackages.length}</strong> packages selected for installation.
        Requirements are validated based on your package selection.
      </div>

      ${this.checking ? html`
        <div class="requirements-list">
          <p><span class="spinner"></span> Checking requirements...</p>
        </div>
      ` : html`
        <div class="summary">
          <div class="summary-item">
            <span class="summary-count passed">${summary.passed}</span>
            <span>Passed</span>
          </div>
          <div class="summary-item">
            <span class="summary-count failed">${summary.failed}</span>
            <span>Failed</span>
          </div>
          <div class="summary-item">
            <span class="summary-count warning">${summary.warning}</span>
            <span>Warnings</span>
          </div>
        </div>

        <div class="requirements-list">
          ${this.requirements.map(req => html`
            <div class="requirement ${req.status}">
              <div class="requirement-icon">${this._getStatusIcon(req.status)}</div>
              <div class="requirement-content">
                <div class="requirement-title">${req.title}</div>
                <div class="requirement-description">${req.description}</div>
              </div>
            </div>
          `)}
        </div>
      `}

      <div class="actions">
        <div class="actions-left">
          <button class="btn-outline" @click=${this._handlePrevious}>Back</button>
          <button class="btn-secondary" @click=${this._checkRequirements} ?disabled=${this.checking}>
            ${this.checking ? html`<span class="spinner"></span>` : ''} Recheck
          </button>
        </div>
        <button class="btn-primary" @click=${this._handleNext} ?disabled=${!this._canProceed()}>
          Continue
        </button>
      </div>
    `;
  }
}

customElements.define('step-requirements', StepRequirements);
