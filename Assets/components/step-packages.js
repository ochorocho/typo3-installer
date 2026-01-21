import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';

export class StepPackages extends LitElement {
  static properties = {
    state: { type: Object },
    loading: { type: Boolean },
    categories: { type: Object },
    requiredPackages: { type: Array },
    selectedPackages: { type: Array }
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

    .categories {
      margin-bottom: var(--spacing-lg, 24px);
    }

    .category {
      margin-bottom: var(--spacing-lg, 24px);
      border: 1px solid var(--color-border, #ddd);
      border-radius: var(--border-radius, 4px);
      overflow: hidden;
    }

    .category-header {
      background: var(--color-bg, #f5f5f5);
      padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
      font-weight: 600;
      color: var(--color-secondary, #1a1a1a);
      border-bottom: 1px solid var(--color-border, #ddd);
    }

    .category-header.core {
      background: linear-gradient(135deg, var(--color-primary, #ff8700) 0%, #ff9500 100%);
      color: white;
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
  `;

  constructor() {
    super();
    this.loading = true;
    this.categories = {};
    this.requiredPackages = [];
    this.selectedPackages = [];
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadPackages();
  }

  async _loadPackages() {
    this.loading = true;

    try {
      const response = await apiClient.getPackages();

      this.categories = response.packages || {};
      this.requiredPackages = response.required || [];

      // Initialize selected packages from state or use required + recommended defaults
      if (this.state?.packages?.selected?.length > 0) {
        this.selectedPackages = [...this.state.packages.selected];
      } else {
        // Start with required packages and add common content packages
        this.selectedPackages = [
          ...this.requiredPackages,
          'typo3/cms-fluid',
          'typo3/cms-fluid-styled-content',
          'typo3/cms-extbase',
          'typo3/cms-rte-ckeditor',
          'typo3/cms-filelist',
          'typo3/cms-beuser',
          'typo3/cms-setup',
        ];
      }

      this._updateState();
    } catch (error) {
      console.error('Failed to load packages:', error);
    } finally {
      this.loading = false;
    }
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
        packages: {
          available: this.categories,
          selected: this.selectedPackages,
          validated: false
        }
      }
    }));
  }

  _handleNext() {
    this.dispatchEvent(new CustomEvent('next-step', { bubbles: true, composed: true }));
  }

  _getCategoryClass(categoryId) {
    return categoryId === 'core' ? 'core' : '';
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

    const totalPackages = Object.values(this.categories)
      .reduce((sum, cat) => sum + Object.keys(cat.packages || {}).length, 0);

    return html`
      <h2>Select Packages</h2>
      <p>Choose which TYPO3 packages to install. Core packages are required and cannot be deselected.</p>

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

      <div class="categories">
        ${Object.entries(this.categories).map(([categoryId, category]) => html`
          <div class="category">
            <div class="category-header ${this._getCategoryClass(categoryId)}">
              ${category.label}
            </div>
            <div class="packages">
              ${Object.entries(category.packages || {}).map(([packageId, pkg]) => html`
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
          </div>
        `)}
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
