import { LitElement, html } from 'lit';

/**
 * PHP version mismatch warning with binary selector.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element t3-php-version-warning
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
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    phpDetection: { type: Object },
    customBinaryPath: { type: String },
    validatingBinary: { type: Boolean },
    showCustomInput: { type: Boolean }
  };

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
