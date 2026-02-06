import { LitElement, html } from 'lit';
import { emit } from './shared-styles.js';
import './loading-skeleton.js';
import './section-error.js';
import './spinner.js';

/**
 * Package list with checkboxes for selection.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element t3-package-list
 * @fires package-toggle - When checkbox toggled, detail: { packageId, selected }
 * @fires packages-toggle-all - When group toggle-all changed, detail: { packageIds, selected }
 * @fires retry - When retry button is clicked after error
 */
export class PackageList extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    packages: { type: Object },
    selectedPackages: { type: Array, attribute: 'selected-packages' },
    requiredPackages: { type: Array, attribute: 'required-packages' },
    typo3Version: { type: String, attribute: 'typo3-version' },
    loading: { type: Boolean },
    error: { type: Object },
    versionsReady: { type: Boolean, attribute: 'versions-ready' }
  };

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
    if (this.error) return html`<t3-section-error title="Failed to Load Packages" .message=${this.error.message} context="general"></t3-section-error>`;

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
            <input type="checkbox"
                   .checked=${themeSelected === themePkgs.length}
                   .indeterminate=${themeSelected > 0 && themeSelected < themePkgs.length}
                   @change=${(e) => this._toggleAll(themePkgs, e.target.checked)}>
            <label class="group-toggle">
              Themes (${themeSelected}/${themePkgs.length})
            </label>
          </div>
          ${themePkgs.map(renderPackage)}
        ` : ''}
        ${extensionPkgs.length > 0 ? html`
          <div class="group-header">
            <input type="checkbox"
                   .checked=${extensionSelected === extensionPkgs.length}
                   .indeterminate=${extensionSelected > 0 && extensionSelected < extensionPkgs.length}
                   @change=${(e) => this._toggleAll(extensionPkgs, e.target.checked)}>
            <label class="group-toggle">
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
