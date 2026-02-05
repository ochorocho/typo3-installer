import { LitElement, html, css } from 'lit';
import { hostStyles, emit } from './shared-styles.js';
import './loading-skeleton.js';
import './section-error.js';
import './spinner.js';

/**
 * Package list with checkboxes for selection.
 * @element t3-package-list
 * @fires package-toggle - When checkbox toggled, detail: { packageId, selected }
 * @fires packages-toggle-all - When group toggle-all changed, detail: { packageIds, selected }
 * @fires retry - When retry button is clicked after error
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

  static styles = [
    hostStyles,
    css`
      :host { margin-bottom: var(--spacing-lg, 24px); }
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
      .package input {
        margin-right: var(--spacing-md, 16px);
        margin-top: 4px;
        width: 18px;
        height: 18px;
        cursor: pointer;
        accent-color: var(--color-primary, #ff8700);
      }
      .package input:disabled { cursor: not-allowed; }
      .package-info { flex: 1; cursor: pointer; }
      .package-name { font-weight: 600; color: var(--color-secondary, #1a1a1a); }
      .package-id {
        font-size: 12px;
        font-family: monospace;
        margin-left: var(--spacing-sm, 8px);
        color: var(--color-text-light, #333333);
      }
      .package-desc {
        font-size: 14px;
        margin-top: var(--spacing-xs, 4px);
        color: var(--color-text-light, #333333);
      }
      .group-header {
        font-size: 14px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--color-text-light, #333333);
        padding: var(--spacing-md, 16px) var(--spacing-sm, 8px) var(--spacing-xs, 4px);
        border-bottom: 1px solid var(--color-border, #bbbbbb);
        margin-bottom: var(--spacing-xs, 4px);
        position: sticky;
        top: 0;
        background: var(--color-bg-white, white);
        z-index: 10;
      }
      .group-header:not(:first-child) {
        margin-top: var(--spacing-md, 16px);
      }
      .group-toggle {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        cursor: pointer;
        font-weight: 600;
      }
      .group-toggle input {
        width: 16px;
        height: 16px;
        cursor: pointer;
        accent-color: var(--color-primary, #ff8700);
      }
    `
  ];

  constructor() {
    super();
    this.packages = {};
    this.selectedPackages = [];
    this.requiredPackages = [];
  }

  _toggle(id) {
    if (this.requiredPackages.includes(id)) return;
    emit(this, 'package-toggle', { packageId: id, selected: !this.selectedPackages.includes(id) });
  }

  _toggleAll(packages, selected) {
    const packageIds = packages.map(([id]) => id);
    emit(this, 'packages-toggle-all', { packageIds, selected });
  }

  render() {
    if (!this.versionsReady) return null;
    if (this.loading) return html`<ui-spinner>Loading packages for TYPO3 ${this.typo3Version}...</ui-spinner>`;
    if (this.error) return html`<t3-section-error title="Failed to Load Packages" message=${this.error.message}></t3-section-error>`;

    // Group packages into categories (exclude required packages from display)
    const entries = Object.entries(this.packages);
    const themePkgs = entries.filter(([id]) => !this.requiredPackages.includes(id) && id.startsWith('typo3/theme-')).sort(([a], [b]) => a.localeCompare(b));
    const extensionPkgs = entries.filter(([id]) => !this.requiredPackages.includes(id) && !id.startsWith('typo3/theme-')).sort(([a], [b]) => a.localeCompare(b));

    const renderPackage = ([id, pkg]) => {
      const selected = this.selectedPackages.includes(id);
      const inputId = `pkg-${id.replace('/', '-')}`;
      return html`
        <div class="package">
          <input type="checkbox" id=${inputId} .checked=${selected} @change=${() => this._toggle(id)}>
          <label for=${inputId} class="package-info">
            <div><span class="package-name">${pkg.name}</span><span class="package-id">${id}</span></div>
            <div class="package-desc">${pkg.description}</div>
          </label>
        </div>
      `;
    };

    // Calculate selected counts per group
    const themeSelected = themePkgs.filter(([id]) => this.selectedPackages.includes(id)).length;
    const extensionSelected = extensionPkgs.filter(([id]) => this.selectedPackages.includes(id)).length;

    return html`
      <div class="packages" role="group" aria-label="Available TYPO3 packages">
        ${themePkgs.length > 0 ? html`
          <div class="group-header">
            <label class="group-toggle">
              <input type="checkbox"
                     .checked=${themeSelected === themePkgs.length}
                     .indeterminate=${themeSelected > 0 && themeSelected < themePkgs.length}
                     @change=${(e) => this._toggleAll(themePkgs, e.target.checked)}>
              Themes (${themeSelected}/${themePkgs.length})
            </label>
          </div>
          ${themePkgs.map(renderPackage)}
        ` : ''}
        ${extensionPkgs.length > 0 ? html`
          <div class="group-header">
            <label class="group-toggle">
              <input type="checkbox"
                     .checked=${extensionSelected === extensionPkgs.length}
                     .indeterminate=${extensionSelected > 0 && extensionSelected < extensionPkgs.length}
                     @change=${(e) => this._toggleAll(extensionPkgs, e.target.checked)}>
              Core Extensions (${extensionSelected}/${extensionPkgs.length})
            </label>
          </div>
          ${extensionPkgs.map(renderPackage)}
        ` : ''}
      </div>
    `;
  }
}

customElements.define('t3-package-list', PackageList);
