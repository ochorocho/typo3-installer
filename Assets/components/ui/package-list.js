import { LitElement, html, css } from 'lit';
import './loading-skeleton.js';
import './section-error.js';

/**
 * Displays a list of TYPO3 packages with checkboxes for selection.
 *
 * @element t3-package-list
 * @fires package-toggle - When a checkbox is toggled, detail: { packageId, selected }
 * @fires retry - When retry button is clicked after an error
 *
 * @prop {Object} packages - Packages keyed by ID with { name, description }
 * @prop {Array} selectedPackages - Array of selected package IDs
 * @prop {Array} requiredPackages - Array of required package IDs (cannot deselect)
 * @prop {String} typo3Version - TYPO3 version for loading message
 * @prop {Boolean} loading - Whether in loading state
 * @prop {Object} error - Error object with message property
 * @prop {Boolean} versionsReady - Whether versions are loaded
 */
export class PackageList extends LitElement {
  static properties = {
    packages: { type: Object },
    selectedPackages: { type: Array, attribute: 'selected-packages' },
    requiredPackages: { type: Array, attribute: 'required-packages' },
    typo3Version: { type: String, attribute: 'typo3-version' },
    loading: { type: Boolean },
    error: { type: Object },
    versionsReady: { type: Boolean, attribute: 'versions-ready' }
  };

  static styles = css`
    :host {
      display: block;
      margin-bottom: var(--spacing-lg, 24px);
    }

    .summary {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-md, 16px);
      border-radius: var(--border-radius, 4px);
      margin-bottom: var(--spacing-lg, 24px);
      background: var(--color-bg, #f9f9f9);
    }

    .summary-item { text-align: center; }

    .summary-count {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-primary, #ff8700);
    }

    .summary-label {
      font-size: 12px;
      text-transform: uppercase;
      color: var(--color-text-light, #666);
    }

    .packages { padding: var(--spacing-sm, 8px); }

    .package {
      display: flex;
      align-items: flex-start;
      padding: var(--spacing-sm, 8px);
      border-radius: var(--border-radius, 4px);
    }

    .package:focus-within {
      outline: 2px solid var(--color-primary, #ff8700);
      outline-offset: 2px;
    }

    .package input[type="checkbox"] {
      margin-right: var(--spacing-md, 16px);
      margin-top: 4px;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--color-primary, #ff8700);
    }

    .package input[type="checkbox"]:disabled { cursor: not-allowed; }

    .package-info { flex: 1; cursor: pointer; }
    .package.required .package-info { cursor: default; }

    .package-name {
      font-weight: 600;
      color: var(--color-secondary, #1a1a1a);
    }

    .package-id {
      font-size: 12px;
      font-family: monospace;
      margin-left: var(--spacing-sm, 8px);
      color: var(--color-text-light, #666);
    }

    .package-description {
      font-size: 14px;
      margin-top: var(--spacing-xs, 4px);
      color: var(--color-text-light, #666);
    }

    .package.required { background: #fff8e1; }

    .package.required .package-name::after {
      content: ' (required)';
      font-size: 12px;
      font-weight: normal;
      color: var(--color-primary, #ff8700);
    }
  `;

  constructor() {
    super();
    this.packages = {};
    this.selectedPackages = [];
    this.requiredPackages = [];
    this.typo3Version = '';
    this.loading = false;
    this.error = null;
    this.versionsReady = false;
  }

  _isSelected(id) { return this.selectedPackages.includes(id); }
  _isRequired(id) { return this.requiredPackages.includes(id); }

  _handleToggle(packageId) {
    if (this._isRequired(packageId)) return;
    this.dispatchEvent(new CustomEvent('package-toggle', {
      bubbles: true,
      composed: true,
      detail: { packageId, selected: !this._isSelected(packageId) }
    }));
  }

  render() {
    if (!this.versionsReady) return html``;

    if (this.loading) {
      return html`Loading packages for TYPO3 ${this.typo3Version}...`;
    }

    if (this.error) {
      return html`
        <t3-section-error
          title="Failed to Load Packages"
          message=${this.error.message}
        ></t3-section-error>
      `;
    }

    const total = Object.keys(this.packages).length;

    return html`
      <div class="summary">
        <div class="summary-item">
          <div class="summary-count">${this.selectedPackages.length}</div>
          <div class="summary-label">Selected</div>
        </div>
        <div class="summary-item">
          <div class="summary-count">${total}</div>
          <div class="summary-label">Available</div>
        </div>
        <div class="summary-item">
          <div class="summary-count">${this.requiredPackages.length}</div>
          <div class="summary-label">Required</div>
        </div>
      </div>
      <div class="package-list">
        <div class="packages" role="group" aria-label="Available TYPO3 packages">
          ${Object.entries(this.packages).map(([id, pkg]) => html`
            <div class="package ${this._isRequired(id) ? 'required' : ''}">
              <input
                type="checkbox"
                id="pkg-${id.replace('/', '-')}"
                .checked=${this._isSelected(id)}
                ?disabled=${this._isRequired(id)}
                @change=${() => this._handleToggle(id)}
              >
              <label for="pkg-${id.replace('/', '-')}" class="package-info">
                <div>
                  <span class="package-name">${pkg.name}</span>
                  <span class="package-id">${id}</span>
                </div>
                <div class="package-description">${pkg.description}</div>
              </label>
            </div>
          `)}
        </div>
      </div>
    `;
  }
}

customElements.define('t3-package-list', PackageList);
