import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';
import { stepBaseStyles, buttonStyles, srOnlyStyles, emit } from './ui/shared-styles.js';
import './ui/php-version-warning.js';
import './ui/section-error.js';
import './ui/step-actions.js';
import './ui/t3-icon.js';
import './ui/spinner.js';

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
    srOnlyStyles,
    css`
      .requirements-list { margin-bottom: var(--spacing-lg, 24px); }

      .requirement {
        display: flex;
        align-items: flex-start;
        padding: var(--spacing-md, 16px);
        border: 1px solid var(--color-border, #bbbbbb);
        border-radius: var(--border-radius, 4px);
        margin-bottom: var(--spacing-sm, 8px);
        background: var(--color-bg-white, white);
        color: var(--color-text, #1a1a1a);
      }

      .requirement.passed { border-left: 4px solid var(--color-success, #4caf50); }
      .requirement.failed { border-left: 4px solid var(--color-error, #f44336); }
      .requirement.warning { border-left: 4px solid var(--color-warning, #ff9800); }

      .requirement-icon {
        width: 24px;
        height: 24px;
        margin-right: var(--spacing-md, 16px);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .requirement-icon t3-icon {
        width: 20px;
        height: 20px;
      }

      .requirement.passed .requirement-icon { color: var(--color-success, #1cb841); }
      .requirement.failed .requirement-icon { color: var(--color-error, #c83c3c); }
      .requirement.warning .requirement-icon { color: var(--color-warning, #f76707); }

      .requirement-content { flex: 1; }
      .requirement-title { font-weight: 600; margin-bottom: var(--spacing-xs, 4px); }
      .requirement-description { font-size: 14px; color: var(--color-text-light, #333333); }

      .requirement-packages {
        display: flex;
        flex-wrap: wrap;
        gap: var(--spacing-xs, 4px);
        margin-top: var(--spacing-xs, 4px);
      }
      .package-badge {
        font-size: 11px;
        padding: 2px 6px;
        background: var(--color-bg, #f5f5f5);
        border-radius: 3px;
        color: var(--color-text-light, #333333);
      }

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
      .summary-count.passed { color: var(--color-success-accessible, #137526); }
      .summary-count.failed { color: var(--color-error-accessible, #b33636); }
      .summary-count.warning { color: var(--color-warning, #f76707); }

      .packages-info {
        font-size: 14px;
        color: var(--color-text-light, #333333);
        background: var(--color-bg, #f5f5f5);
        padding: var(--spacing-md, 16px);
        border-radius: var(--border-radius, 4px);
        margin-bottom: var(--spacing-lg, 24px);
      }

      .packages-info strong { color: var(--color-secondary, #1a1a1a); }

      .error-actions {
        margin-top: var(--spacing-md, 16px);
        margin-bottom: var(--spacing-lg, 24px);
      }
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

    // Check if we have fresh cached results from prefetch
    const cachedFor = this.state?.requirements?.prefetchedFor;
    const currentPackages = this.state?.packages?.selected || [];
    const currentVersion = this.state?.typo3Version || '13.4';

    const isCacheFresh = cachedFor &&
      cachedFor.version === currentVersion &&
      JSON.stringify([...cachedFor.packages].sort()) === JSON.stringify([...currentPackages].sort());

    if (this.state?.requirements?.checked && isCacheFresh) {
      // Use cached results from prefetch
      this.requirements = this.state.requirements.results;
      if (this.state?.phpDetection?.checked) {
        this.phpDetection = this.state.phpDetection;
      }
    } else if (this.state?.requirements?.checked && !cachedFor) {
      // Legacy path: results without prefetch metadata (e.g., from previous check)
      this.requirements = this.state.requirements.results;
      if (this.state?.phpDetection?.checked) {
        this.phpDetection = this.state.phpDetection;
      }
    } else {
      // Need fresh check
      this._checkRequirements();
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

      emit(this, 'state-update', {
        requirements: {
          checked: true,
          passed: requirementsResponse.passed,
          results: this.requirements,
          prefetchedFor: {
            packages: [...(this.state?.packages?.selected || [])],
            version: this.state?.typo3Version || '13.4'
          }
        },
        packages: { ...this.state.packages, validated: true },
        phpDetection: this.phpDetection
      });
    } catch (error) {
      this.error = {
        message: error.getUserMessage?.() || error.message || 'Failed to check requirements',
        details: error.details?.details || null
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
    emit(this, 'state-update', { phpDetection: this.phpDetection });
  }

  _getStatusIcon(status) {
    switch (status) {
      case 'passed':
        return html`<t3-icon identifier="actions-check"></t3-icon>`;
      case 'failed':
        return html`<t3-icon identifier="actions-close"></t3-icon>`;
      case 'warning':
        return html`<t3-icon identifier="actions-exclamation-triangle"></t3-icon>`;
      default:
        return html`<t3-icon identifier="actions-circle"></t3-icon>`;
    }
  }

  _getSummary() {
    return {
      passed: this.requirements.filter(r => r.status === 'passed').length,
      failed: this.requirements.filter(r => r.status === 'failed').length,
      warning: this.requirements.filter(r => r.status === 'warning').length
    };
  }

  render() {
    const summary = this._getSummary();
    const selectedPackages = this.state?.packages?.selected || [];

    // Button enabled only when: not checking, no errors, no failures, PHP resolved
    const phpResolved = !this.phpDetection?.mismatch || this.phpDetection?.selectedBinary;
    const canContinue = !this.checking &&
                        !this.error &&
                        this.requirements.length > 0 &&
                        summary.failed === 0 &&
                        phpResolved;

    return html`
      <h2>System Requirements</h2>
      <p>Checking if your server meets the requirements for the selected TYPO3 packages.</p>

      <div class="packages-info">
        <strong>${selectedPackages.length}</strong> TYPO3 packages selected for installation.
      </div>

      ${this.error ? html`
        <t3-section-error
          title="Requirements Check Failed"
          .message=${this.error.message}
          .details=${this.error.details || ''}
          context="requirements"
        ></t3-section-error>
        <div class="error-actions">
          <button class="btn-error" @click=${this._checkRequirements}>Try Again</button>
        </div>
      ` : this.checking ? html`
        <div class="requirements-list">
          <ui-spinner>Checking requirements...</ui-spinner>
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
                ${req.packages?.length > 0 ? html`
                  <div class="requirement-packages">
                    ${req.packages.slice(0, 3).map(pkg => html`
                      <span class="package-badge">${pkg.replace('typo3/cms-', '')}</span>
                    `)}
                    ${req.packages.length > 3 ? html`<span class="package-badge">+${req.packages.length - 3}</span>` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
          `)}
        </div>
      `}

      <t3-step-actions .canContinue=${canContinue} ?loading=${this.checking}></t3-step-actions>
    `;
  }
}

customElements.define('step-requirements', StepRequirements);
