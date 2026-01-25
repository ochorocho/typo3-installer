import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';
import { stepBaseStyles, buttonStyles, spinnerStyles, srOnlyStyles } from './ui/shared-styles.js';
import './ui/error-help.js';
import './ui/php-version-warning.js';
import './ui/step-actions.js';

/**
 * System requirements check step.
 * @element step-requirements
 */
export class StepRequirements extends LitElement {
  static properties = {
    state: { type: Object },
    checking: { type: Boolean },
    requirements: { type: Array },
    error: { type: Object },
    phpDetection: { type: Object },
    customBinaryPath: { type: String },
    validatingBinary: { type: Boolean },
    _showCustomBinaryInput: { type: Boolean, state: true }
  };

  static styles = [
    stepBaseStyles,
    buttonStyles,
    spinnerStyles,
    srOnlyStyles,
    css`
      .requirements-list { margin-bottom: var(--spacing-lg, 24px); }

      .requirement {
        display: flex;
        align-items: flex-start;
        padding: var(--spacing-md, 16px);
        border: 1px solid var(--color-border, #ddd);
        border-radius: var(--border-radius, 4px);
        margin-bottom: var(--spacing-sm, 8px);
        background: white;
      }

      .requirement.passed { border-left: 4px solid var(--color-success, #4caf50); }
      .requirement.failed { border-left: 4px solid var(--color-error, #f44336); }
      .requirement.warning { border-left: 4px solid var(--color-warning, #ff9800); }

      .requirement-icon {
        width: 24px;
        height: 24px;
        margin-right: var(--spacing-md, 16px);
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .requirement.passed .requirement-icon { color: var(--color-success, #1cb841); }
      .requirement.failed .requirement-icon { color: var(--color-error, #c83c3c); }
      .requirement.warning .requirement-icon { color: var(--color-warning, #f76707); }

      .requirement-content { flex: 1; }
      .requirement-title { font-weight: 600; margin-bottom: var(--spacing-xs, 4px); }
      .requirement-description { font-size: 14px; color: var(--color-text-light, #666); }

      .summary {
        display: flex;
        gap: var(--spacing-lg, 24px);
        padding: var(--spacing-md, 16px);
        background: var(--color-bg, #f5f5f5);
        border-radius: var(--border-radius, 4px);
        margin-bottom: var(--spacing-lg, 24px);
      }

      .summary-item { display: flex; align-items: center; gap: var(--spacing-sm, 8px); }
      .summary-count { font-weight: 600; font-size: 1.25rem; }
      .summary-count.passed { color: var(--color-success, #1cb841); }
      .summary-count.failed { color: var(--color-error, #c83c3c); }
      .summary-count.warning { color: var(--color-warning, #f76707); }

      .packages-info {
        font-size: 14px;
        color: var(--color-text-light, #666);
        background: var(--color-bg, #f5f5f5);
        padding: var(--spacing-md, 16px);
        border-radius: var(--border-radius, 4px);
        margin-bottom: var(--spacing-lg, 24px);
      }

      .packages-info strong { color: var(--color-secondary, #1a1a1a); }

      .error-container {
        background: var(--color-error-bg, #ffebee);
        border: 1px solid var(--color-error, #c83c3c);
        border-radius: var(--border-radius, 4px);
        padding: var(--spacing-lg, 24px);
        margin-bottom: var(--spacing-lg, 24px);
      }

      .error-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-md, 16px);
      }

      .error-icon { width: 24px; height: 24px; color: var(--color-error, #c83c3c); }
      .error-title { font-weight: 600; color: var(--color-error, #c83c3c); font-size: 16px; }
      .error-message { color: #333; margin-bottom: var(--spacing-md, 16px); }
    `
  ];

  constructor() {
    super();
    this.checking = false;
    this.requirements = [];
    this.error = null;
    this.phpDetection = null;
    this.customBinaryPath = '';
    this.validatingBinary = false;
    this._showCustomBinaryInput = false;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.state?.requirements?.checked) {
      this._checkRequirements();
    } else {
      this.requirements = this.state.requirements.results;
      if (this.state?.phpDetection?.checked) {
        this.phpDetection = this.state.phpDetection;
      }
    }
  }

  async _checkRequirements() {
    this.checking = true;
    this.error = null;
    try {
      const [requirementsResponse, phpResponse] = await Promise.all([
        apiClient.validateRequirements(this.state?.packages?.selected || [], this.state?.typo3Version || '13.4'),
        apiClient.detectPhp()
      ]);

      this.requirements = requirementsResponse.requirements || [];

      this.phpDetection = {
        checked: true,
        fpmVersion: phpResponse.fpmVersion,
        cliBinary: phpResponse.cliBinary,
        cliVersion: phpResponse.cliVersion,
        mismatch: phpResponse.mismatch,
        availableVersions: phpResponse.availableVersions || [],
        selectedBinary: phpResponse.mismatch ? null : phpResponse.cliBinary
      };

      this.dispatchEvent(new CustomEvent('state-update', {
        bubbles: true,
        composed: true,
        detail: {
          requirements: { checked: true, passed: requirementsResponse.passed, results: this.requirements },
          packages: { ...this.state.packages, validated: true },
          phpDetection: this.phpDetection
        }
      }));
    } catch (error) {
      this.error = {
        message: error.getUserMessage?.() || error.message || 'Failed to check requirements',
        details: error.details || null
      };
    } finally {
      this.checking = false;
    }
  }

  _handlePhpBinaryChange(e) {
    this.phpDetection = { ...this.phpDetection, selectedBinary: e.detail.path };
    this._updatePhpDetectionState();
  }

  _handleCustomPathChange(e) {
    this.customBinaryPath = e.detail.path;
  }

  async _validateCustomBinary() {
    if (!this.customBinaryPath.trim()) return;

    this.validatingBinary = true;
    try {
      const response = await apiClient.validatePhpBinary(this.customBinaryPath.trim());

      if (response.valid) {
        this.phpDetection = {
          ...this.phpDetection,
          selectedBinary: this.customBinaryPath.trim(),
          customBinaryValid: true,
          customBinaryVersion: response.version,
          customBinaryMatchesFpm: response.matchesFpm
        };
        this._updatePhpDetectionState();
      } else {
        this.phpDetection = { ...this.phpDetection, customBinaryValid: false, customBinaryError: response.error || 'Invalid PHP binary' };
      }
    } catch (error) {
      this.phpDetection = { ...this.phpDetection, customBinaryValid: false, customBinaryError: error.message || 'Failed to validate binary' };
    } finally {
      this.validatingBinary = false;
    }
  }

  _toggleCustomBinaryInput() {
    this._showCustomBinaryInput = !this._showCustomBinaryInput;
  }

  _updatePhpDetectionState() {
    this.dispatchEvent(new CustomEvent('state-update', {
      bubbles: true,
      composed: true,
      detail: { phpDetection: this.phpDetection }
    }));
  }

  _getStatusIcon(status) {
    const icons = { passed: '\u2713', failed: '\u2717', warning: '\u26A0' };
    return icons[status] || '?';
  }

  _getSummary() {
    return {
      passed: this.requirements.filter(r => r.status === 'passed').length,
      failed: this.requirements.filter(r => r.status === 'failed').length,
      warning: this.requirements.filter(r => r.status === 'warning').length
    };
  }

  _canProceed() {
    if (!this.state?.requirements?.passed || this.checking) return false;
    if (this.phpDetection?.mismatch) return this.phpDetection.selectedBinary !== null;
    return true;
  }

  render() {
    const summary = this._getSummary();
    const selectedPackages = this.state?.packages?.selected || [];

    return html`
      <h2>System Requirements</h2>
      <p>Checking if your server meets the requirements for the selected TYPO3 packages.</p>

      <div class="packages-info">
        <strong>${selectedPackages.length}</strong> packages selected for installation.
      </div>

      ${this.error ? html`
        <div class="error-container" role="alert">
          <div class="error-header">
            <svg class="error-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            <span class="error-title">Requirements Check Failed</span>
          </div>
          <p class="error-message">${this.error.message}</p>
          <t3-error-help .error=${this.error} context="requirements"></t3-error-help>
          <button class="btn-error" @click=${this._checkRequirements}>Try Again</button>
        </div>
      ` : this.checking ? html`
        <div class="requirements-list">
          <p><span class="spinner"></span> Checking requirements...</p>
        </div>
      ` : html`
        <div class="summary">
          <div class="summary-item">
            <span class="summary-count passed">${summary.passed}</span><span>Passed</span>
          </div>
          <div class="summary-item">
            <span class="summary-count failed">${summary.failed}</span><span>Failed</span>
          </div>
          <div class="summary-item">
            <span class="summary-count warning">${summary.warning}</span><span>Warnings</span>
          </div>
        </div>

        <t3-php-version-warning
          .phpDetection=${this.phpDetection}
          .customBinaryPath=${this.customBinaryPath}
          .validatingBinary=${this.validatingBinary}
          .showCustomInput=${this._showCustomBinaryInput}
          @binary-change=${this._handlePhpBinaryChange}
          @custom-path-change=${this._handleCustomPathChange}
          @validate-binary=${this._validateCustomBinary}
          @toggle-custom-input=${this._toggleCustomBinaryInput}
        ></t3-php-version-warning>

        <div class="requirements-list" role="list" aria-label="System requirements">
          ${this.requirements.map(req => html`
            <div class="requirement ${req.status}" role="listitem">
              <div class="requirement-icon" aria-hidden="true">${this._getStatusIcon(req.status)}</div>
              <div class="requirement-content">
                <div class="requirement-title">
                  ${req.title}
                  <span class="sr-only">- ${req.status === 'passed' ? 'Passed' : req.status === 'failed' ? 'Failed' : 'Warning'}</span>
                </div>
                <div class="requirement-description">${req.description}</div>
              </div>
            </div>
          `)}
        </div>
      `}

      <t3-step-actions ?can-continue=${this._canProceed()}>
        <button slot="left" class="btn-secondary" @click=${this._checkRequirements} ?disabled=${this.checking}>
          ${this.checking ? html`<span class="spinner"></span>` : ''} Recheck
        </button>
      </t3-step-actions>
    `;
  }
}

customElements.define('step-requirements', StepRequirements);
