import { LitElement, html, css } from 'lit';
import { hostStyles, buttonStyles, spinnerStyles } from './shared-styles.js';

/**
 * @element t3-php-version-warning
 * @description Component for displaying PHP version mismatch warning with binary selector
 *
 * @property {Object} phpDetection - PHP detection data (fpmVersion, cliVersion, mismatch, availableVersions, selectedBinary, customBinaryValid, customBinaryVersion, customBinaryError, customBinaryMatchesFpm)
 * @property {String} customBinaryPath - Current custom path input value
 * @property {Boolean} validatingBinary - Whether binary validation is in progress
 * @property {Boolean} showCustomInput - Whether to show custom path input section
 *
 * @fires binary-change - Dropdown selection changed, detail: { path }
 * @fires custom-path-change - Custom path input changed, detail: { path }
 * @fires validate-binary - Validate button clicked
 * @fires toggle-custom-input - Toggle link clicked
 */
export class PhpVersionWarning extends LitElement {
  static properties = {
    phpDetection: { type: Object },
    customBinaryPath: { type: String },
    validatingBinary: { type: Boolean },
    showCustomInput: { type: Boolean }
  };

  static styles = [
    hostStyles,
    buttonStyles,
    spinnerStyles,
    css`
    .php-version-warning {
      background: var(--color-warning-bg, #fff3e0);
      border: 1px solid var(--color-warning, #f76707);
      border-radius: var(--border-radius, 4px);
      padding: var(--spacing-lg, 24px);
      margin-bottom: var(--spacing-lg, 24px);
    }

    .php-version-warning h3 {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm, 8px);
      color: var(--color-warning, #f76707);
      margin: 0 0 var(--spacing-md, 16px) 0;
      font-size: 16px;
    }

    .php-version-warning h3::before {
      content: '\u26A0';
      font-size: 1.25rem;
    }

    .php-version-info {
      margin-bottom: var(--spacing-md, 16px);
      color: var(--color-text, #333);
    }

    .php-version-info p {
      margin: 0 0 var(--spacing-sm, 8px) 0;
    }

    .php-version-info strong {
      color: var(--color-secondary, #1a1a1a);
    }

    .php-selector {
      margin-top: var(--spacing-md, 16px);
    }

    .php-selector label {
      display: block;
      margin-bottom: var(--spacing-sm, 8px);
      font-weight: 500;
      color: var(--color-text, #333);
    }

    .php-selector select,
    .php-selector input[type="text"] {
      width: 100%;
      max-width: 400px;
      padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
      border: 1px solid var(--color-border, #bbbbbb);
      border-radius: var(--border-radius, 4px);
      font-size: 14px;
      background: var(--color-input-bg, #ffffff);
    }

    .php-selector select:focus,
    .php-selector input[type="text"]:focus {
      outline: 2px solid var(--color-primary, #ff8700);
      outline-offset: 2px;
    }

    .php-selector-row {
      display: flex;
      gap: var(--spacing-sm, 8px);
      align-items: center;
      margin-bottom: var(--spacing-sm, 8px);
    }

    .php-selector-row input[type="text"] {
      flex: 1;
    }

    .custom-binary-toggle {
      font-size: 13px;
      color: var(--color-info, #0078d4);
      background: none;
      border: none;
      cursor: pointer;
      text-decoration: underline;
      padding: 0;
      margin-top: var(--spacing-sm, 8px);
    }

    .custom-binary-toggle:hover {
      color: var(--color-primary, #ff8700);
    }

    .validation-result {
      margin-top: var(--spacing-sm, 8px);
      padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
      border-radius: var(--border-radius, 4px);
      font-size: 13px;
    }

    .validation-result.success {
      background: var(--color-success-bg, #e8f5e9);
      color: var(--color-success-accessible, #137526);
    }

    .validation-result.error {
      background: var(--color-error-bg, #ffebee);
      color: var(--color-error, #c83c3c);
    }
  `];

  constructor() {
    super();
    this.phpDetection = null;
    this.customBinaryPath = '';
    this.validatingBinary = false;
    this.showCustomInput = false;
  }

  _extractMajorMinor(version) {
    if (!version) return '';
    const parts = version.split('.');
    return `${parts[0]}.${parts[1]}`;
  }

  _handleBinaryChange(e) {
    this.dispatchEvent(new CustomEvent('binary-change', {
      bubbles: true,
      composed: true,
      detail: { path: e.target.value }
    }));
  }

  _handleCustomPathChange(e) {
    this.dispatchEvent(new CustomEvent('custom-path-change', {
      bubbles: true,
      composed: true,
      detail: { path: e.target.value }
    }));
  }

  _handleValidateBinary() {
    this.dispatchEvent(new CustomEvent('validate-binary', {
      bubbles: true,
      composed: true
    }));
  }

  _handleToggleCustomInput() {
    this.dispatchEvent(new CustomEvent('toggle-custom-input', {
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (!this.phpDetection?.checked || !this.phpDetection?.mismatch) {
      return null;
    }

    const availableVersions = this.phpDetection.availableVersions || [];
    const fpmMajorMinor = this._extractMajorMinor(this.phpDetection.fpmVersion);

    return html`
      <div class="php-version-warning" role="alert">
        <h3>PHP Version Mismatch Detected</h3>
        <div class="php-version-info">
          <p>
            Your web server is running <strong>PHP ${this.phpDetection.fpmVersion}</strong>,
            but the default CLI PHP is a different version.
          </p>
          <p>
            TYPO3 CLI commands need to use the same PHP version as the web server.
            Please select a matching PHP binary below.
          </p>
        </div>

        <div class="php-selector">
          ${availableVersions.length > 0 ? html`
            <label for="php-binary-select">Select PHP ${fpmMajorMinor} CLI binary:</label>
            <select
              id="php-binary-select"
              @change=${this._handleBinaryChange}
              .value=${this.phpDetection.selectedBinary || ''}
            >
              <option value="">-- Select a PHP binary --</option>
              ${availableVersions.map(v => html`
                <option
                  value="${v.path}"
                  ?selected=${this.phpDetection.selectedBinary === v.path}
                >
                  ${v.path} (${v.version})
                  ${this._extractMajorMinor(v.version) === fpmMajorMinor ? ' - Recommended' : ''}
                </option>
              `)}
            </select>
          ` : html`
            <p>No matching PHP ${fpmMajorMinor} binaries were found automatically.</p>
          `}

          <button
            type="button"
            class="custom-binary-toggle"
            @click=${this._handleToggleCustomInput}
          >
            ${this.showCustomInput ? 'Hide custom path input' : 'Enter custom PHP path'}
          </button>

          ${this.showCustomInput ? html`
            <div class="php-selector" style="margin-top: var(--spacing-md, 16px);">
              <label for="custom-php-path">Custom PHP binary path:</label>
              <div class="php-selector-row">
                <input
                  type="text"
                  id="custom-php-path"
                  placeholder="/usr/local/bin/php8.3"
                  .value=${this.customBinaryPath}
                  @input=${this._handleCustomPathChange}
                />
                <button
                  class="btn-secondary btn-small"
                  @click=${this._handleValidateBinary}
                  ?disabled=${this.validatingBinary || !this.customBinaryPath.trim()}
                >
                  ${this.validatingBinary ? html`<span class="spinner spinner-dark"></span>` : 'Validate'}
                </button>
              </div>
              ${this.phpDetection.customBinaryValid === true ? html`
                <div class="validation-result success">
                  Valid PHP ${this.phpDetection.customBinaryVersion}
                  ${this.phpDetection.customBinaryMatchesFpm ? ' - Matches web server version' : ''}
                </div>
              ` : this.phpDetection.customBinaryValid === false ? html`
                <div class="validation-result error">
                  ${this.phpDetection.customBinaryError}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
}

customElements.define('t3-php-version-warning', PhpVersionWarning);
