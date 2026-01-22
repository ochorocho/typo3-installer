import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';

export class StepPackages extends LitElement {
  static properties = {
    state: { type: Object },
    loading: { type: Boolean },
    loadingPackages: { type: Boolean },
    packages: { type: Object },
    requiredPackages: { type: Array },
    selectedPackages: { type: Array },
    installInfo: { type: Object },
    versions: { type: Array },
    selectedVersion: { type: String }
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

    .package-list {
      margin-bottom: var(--spacing-lg, 24px);
      border: 1px solid var(--color-border, #ddd);
      border-radius: var(--border-radius, 4px);
      overflow: hidden;
      max-height: 400px;
      overflow-y: auto;
    }

    .packages {
      padding: var(--spacing-sm, 8px);
    }

    .package {
      display: flex;
      align-items: flex-start;
      padding: var(--spacing-sm, 8px);
      border-radius: var(--border-radius, 4px);
      transition: background 0.2s ease;
    }

    .package:hover {
      background: var(--color-bg, #f5f5f5);
    }

    .package input[type="checkbox"] {
      margin-right: var(--spacing-md, 16px);
      margin-top: 4px;
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .package input[type="checkbox"]:disabled {
      cursor: not-allowed;
    }

    .package-info {
      flex: 1;
    }

    .package-name {
      font-weight: 600;
      color: var(--color-secondary, #1a1a1a);
    }

    .package-id {
      font-size: 12px;
      color: var(--color-text-light, #666);
      font-family: monospace;
      margin-left: var(--spacing-sm, 8px);
    }

    .package-description {
      font-size: 14px;
      color: var(--color-text-light, #666);
      margin-top: var(--spacing-xs, 4px);
    }

    .package.required {
      background: #fff8e1;
    }

    .package.required .package-name::after {
      content: ' (required)';
      font-size: 12px;
      font-weight: normal;
      color: var(--color-primary, #ff8700);
    }

    .summary {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-md, 16px);
      background: var(--color-bg, #f5f5f5);
      border-radius: var(--border-radius, 4px);
      margin-bottom: var(--spacing-lg, 24px);
    }

    .summary-item {
      text-align: center;
    }

    .summary-count {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-primary, #ff8700);
    }

    .summary-label {
      font-size: 12px;
      color: var(--color-text-light, #666);
      text-transform: uppercase;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
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

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading {
      text-align: center;
      padding: var(--spacing-xl, 32px);
    }

    .loading .spinner {
      width: 32px;
      height: 32px;
      border-color: var(--color-border, #ddd);
      border-top-color: var(--color-primary, #ff8700);
      margin-bottom: var(--spacing-md, 16px);
    }

    .install-info {
      background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
      border: 1px solid #90caf9;
      border-radius: var(--border-radius, 4px);
      padding: var(--spacing-md, 16px);
      margin-bottom: var(--spacing-lg, 24px);
    }

    .install-info-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm, 8px);
      margin-bottom: var(--spacing-sm, 8px);
    }

    .install-info-header svg {
      width: 20px;
      height: 20px;
      color: #1976d2;
    }

    .install-info-header strong {
      color: #1976d2;
      font-size: 14px;
    }

    .install-info-path {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs, 4px);
    }

    .install-info-path code {
      background: rgba(255, 255, 255, 0.7);
      padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
      border-radius: 3px;
      font-family: monospace;
      font-size: 13px;
      color: #333;
      word-break: break-all;
    }

    .install-info-path small {
      font-size: 12px;
      color: #666;
    }

    .install-info-warnings {
      margin-top: var(--spacing-sm, 8px);
      padding-top: var(--spacing-sm, 8px);
      border-top: 1px solid rgba(144, 202, 249, 0.5);
    }

    .install-info-warnings ul {
      margin: 0;
      padding-left: var(--spacing-md, 16px);
      font-size: 12px;
      color: #e65100;
    }

    .version-selector {
      display: flex;
      align-items: center;
      gap: var(--spacing-md, 16px);
      margin-bottom: var(--spacing-lg, 24px);
      padding: var(--spacing-md, 16px);
      background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
      border: 1px solid var(--color-primary, #ff8700);
      border-radius: var(--border-radius, 4px);
    }

    .version-selector label {
      font-weight: 600;
      color: var(--color-secondary, #1a1a1a);
      white-space: nowrap;
    }

    .version-selector select {
      flex: 1;
      max-width: 200px;
      padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
      font-size: 16px;
      font-weight: 600;
      border: 2px solid var(--color-primary, #ff8700);
      border-radius: var(--border-radius, 4px);
      background: white;
      cursor: pointer;
    }

    .version-selector select:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(255, 135, 0, 0.2);
    }

    .version-selector .version-info {
      font-size: 13px;
      color: var(--color-text-light, #666);
    }

    .package-list.loading {
      opacity: 0.6;
      pointer-events: none;
    }
  `;

  constructor() {
    super();
    this.loading = true;
    this.loadingPackages = false;
    this.packages = {};
    this.requiredPackages = [];
    this.selectedPackages = [];
    this.installInfo = null;
    this.versions = [];
    this.selectedVersion = '13.4';
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadData();
  }

  async _loadData() {
    this.loading = true;

    try {
      // Load versions and install info first
      const [versionsResponse, infoResponse] = await Promise.all([
        apiClient.getVersions(),
        apiClient.getInfo()
      ]);

      // Store versions and select the first (newest) one
      this.versions = versionsResponse.versions || [];
      if (this.versions.length > 0) {
        this.selectedVersion = this.state?.typo3Version || this.versions[0].version;
      }

      // Store install info
      this.installInfo = infoResponse;

      // Now load packages for the selected version
      await this._loadPackages();
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      this.loading = false;
    }
  }

  async _loadPackages() {
    this.loadingPackages = true;

    try {
      const packagesResponse = await apiClient.getPackages(this.selectedVersion);

      // Process packages (flat list keyed by package name)
      this.packages = packagesResponse.packages || {};
      this.requiredPackages = packagesResponse.required || [];
      const recommendedPackages = packagesResponse.recommended || [];

      // Initialize selected packages from state or use required + recommended defaults
      if (this.state?.packages?.selected?.length > 0 && this.state?.typo3Version === this.selectedVersion) {
        this.selectedPackages = [...this.state.packages.selected];
      } else {
        // Only add recommended packages that exist in available packages
        const availableIds = Object.keys(this.packages);
        this.selectedPackages = [
          ...this.requiredPackages,
          ...recommendedPackages.filter(pkg => availableIds.includes(pkg)),
        ];
      }

      this._updateState();
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      this.loadingPackages = false;
    }
  }

  async _handleVersionChange(event) {
    this.selectedVersion = event.target.value;
    await this._loadPackages();
  }

  _isPackageSelected(packageId) {
    return this.selectedPackages.includes(packageId);
  }

  _isPackageRequired(packageId) {
    return this.requiredPackages.includes(packageId);
  }

  _togglePackage(packageId) {
    if (this._isPackageRequired(packageId)) {
      return; // Can't toggle required packages
    }

    if (this._isPackageSelected(packageId)) {
      this.selectedPackages = this.selectedPackages.filter(p => p !== packageId);
    } else {
      this.selectedPackages = [...this.selectedPackages, packageId];
    }

    this._updateState();
  }

  _updateState() {
    this.dispatchEvent(new CustomEvent('state-update', {
      bubbles: true,
      composed: true,
      detail: {
        typo3Version: this.selectedVersion,
        packages: {
          available: this.packages,
          selected: this.selectedPackages,
          validated: false
        }
      }
    }));
  }

  _handleNext() {
    this.dispatchEvent(new CustomEvent('next-step', { bubbles: true, composed: true }));
  }

  render() {
    if (this.loading) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          <p>Loading available packages...</p>
        </div>
      `;
    }

    const totalPackages = Object.keys(this.packages).length;
    const selectedVersionInfo = this.versions.find(v => v.version === this.selectedVersion);

    return html`
      <h2>Select Packages</h2>
      <p>Choose the TYPO3 version and packages to install. Core packages are required and cannot be deselected.</p>

      <div class="version-selector">
        <label for="typo3-version">TYPO3 Version:</label>
        <select id="typo3-version" @change=${this._handleVersionChange} .value=${this.selectedVersion}>
          ${this.versions.map(v => html`
            <option value=${v.version}>${v.version} (Latest: ${v.latest})</option>
          `)}
        </select>
        ${selectedVersionInfo ? html`
          <span class="version-info">Will install typo3/cms-core:^${this.selectedVersion}</span>
        ` : ''}
      </div>

      ${this.installInfo ? html`
        <div class="install-info">
          <div class="install-info-header">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <strong>Installation Path</strong>
          </div>
          <div class="install-info-path">
            <code>${this.installInfo.installPath}</code>
            <small>Web directory: <code>${this.installInfo.webDir}</code></small>
          </div>
          ${this.installInfo.validation?.warnings?.length > 0 ? html`
            <div class="install-info-warnings">
              <ul>
                ${this.installInfo.validation.warnings.map(warning => html`<li>${warning}</li>`)}
              </ul>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="summary">
        <div class="summary-item">
          <div class="summary-count">${this.selectedPackages.length}</div>
          <div class="summary-label">Selected</div>
        </div>
        <div class="summary-item">
          <div class="summary-count">${totalPackages}</div>
          <div class="summary-label">Available</div>
        </div>
        <div class="summary-item">
          <div class="summary-count">${this.requiredPackages.length}</div>
          <div class="summary-label">Required</div>
        </div>
      </div>

      <div class="package-list ${this.loadingPackages ? 'loading' : ''}">
        ${this.loadingPackages ? html`
          <div class="loading">
            <div class="spinner"></div>
            <p>Loading packages for TYPO3 ${this.selectedVersion}...</p>
          </div>
        ` : html`
        <div class="packages">
          ${Object.entries(this.packages).map(([packageId, pkg]) => html`
            <div class="package ${this._isPackageRequired(packageId) ? 'required' : ''}">
              <input
                type="checkbox"
                .checked=${this._isPackageSelected(packageId)}
                ?disabled=${this._isPackageRequired(packageId)}
                @change=${() => this._togglePackage(packageId)}
              >
              <div class="package-info">
                <div>
                  <span class="package-name">${pkg.name}</span>
                  <span class="package-id">${packageId}</span>
                </div>
                <div class="package-description">${pkg.description}</div>
              </div>
            </div>
          `)}
        </div>
        `}
      </div>

      <div class="actions">
        <button class="btn-primary" @click=${this._handleNext}>
          Continue
        </button>
      </div>
    `;
  }
}

customElements.define('step-packages', StepPackages);
