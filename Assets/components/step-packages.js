import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';
import './ui/heading.js';
import './ui/install-info.js';
import './ui/version-selector.js';
import './ui/package-list.js';

export class StepPackages extends LitElement {
  static properties = {
    state: { type: Object },
    // Per-section loading states
    loadingInfo: { type: Boolean },
    loadingVersions: { type: Boolean },
    loadingPackages: { type: Boolean },
    // Per-section error states
    infoError: { type: Object },
    versionsError: { type: Object },
    packagesError: { type: Object },
    // Data
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

    p {
      color: var(--color-text-light, #666);
      margin-bottom: var(--spacing-lg, 24px);
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
      font-weight: 500;
      cursor: pointer;
    }

    button:focus-visible {
      outline: 2px solid var(--color-primary, #ff8700);
      outline-offset: 2px;
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
      background: var(--color-primary-dark, #e67a00);
    }
  `;

  constructor() {
    super();
    // Per-section loading states
    this.loadingInfo = true;
    this.loadingVersions = true;
    this.loadingPackages = false;
    // Per-section error states
    this.infoError = null;
    this.versionsError = null;
    this.packagesError = null;
    // Data
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
    // Fire all requests in parallel, each handles its own state
    this._loadInfo();
    this._loadVersions();
  }

  async _loadInfo() {
    this.loadingInfo = true;
    this.infoError = null;
    try {
      this.installInfo = await apiClient.getInfo();
    } catch (error) {
      console.error('Failed to load info:', error);
      this.infoError = {
        message: error.getUserMessage?.() || error.message || 'Failed to load installation info',
        details: error.details || null
      };
    } finally {
      this.loadingInfo = false;
    }
  }

  async _loadVersions() {
    this.loadingVersions = true;
    this.versionsError = null;
    try {
      const response = await apiClient.getVersions();
      this.versions = response.versions || [];
      if (this.versions.length > 0) {
        this.selectedVersion = this.state?.typo3Version || this.versions[0].version;
        // Trigger package loading once we have a version
        this._loadPackages();
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
      this.versionsError = {
        message: error.getUserMessage?.() || error.message || 'Failed to load TYPO3 versions',
        details: error.details || null
      };
    } finally {
      this.loadingVersions = false;
    }
  }

  async _loadPackages() {
    this.loadingPackages = true;
    this.packagesError = null;

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
      this.packagesError = {
        message: error.getUserMessage?.() || error.message || 'Failed to load packages',
        details: error.details || null
      };
    } finally {
      this.loadingPackages = false;
    }
  }

  _handleVersionChange(event) {
    this.selectedVersion = event.detail.version;
    this._loadPackages();
  }

  _handlePackageToggle(event) {
    const { packageId, selected } = event.detail;

    if (selected) {
      this.selectedPackages = [...this.selectedPackages, packageId];
    } else {
      this.selectedPackages = this.selectedPackages.filter(p => p !== packageId);
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

  _handleRetryInfo() {
    this._loadInfo();
  }

  _handleRetryVersions() {
    this._loadVersions();
  }

  _handleRetryPackages() {
    this._loadPackages();
  }

  render() {
    // Determine if Continue button should be disabled
    const canContinue = !this.loadingPackages && !this.packagesError && this.versions.length > 0;
    const versionsReady = !this.loadingVersions && !this.versionsError && this.versions.length > 0;

    return html`
      <t3-install-info
        .info=${this.installInfo}
        .loading=${this.loadingInfo}
        .error=${this.infoError}
        @retry=${this._handleRetryInfo}
      ></t3-install-info>

      <t3-heading level="2">Select Packages</t3-heading>
      <p>Choose the TYPO3 version and packages to install. Core packages are required and cannot be deselected.</p>

      <t3-version-selector
        .versions=${this.versions}
        .selectedVersion=${this.selectedVersion}
        .loading=${this.loadingVersions}
        .error=${this.versionsError}
        @version-change=${this._handleVersionChange}
        @retry=${this._handleRetryVersions}
      ></t3-version-selector>

      <t3-package-list
        .packages=${this.packages}
        .selectedPackages=${this.selectedPackages}
        .requiredPackages=${this.requiredPackages}
        .typo3Version=${this.selectedVersion}
        .loading=${this.loadingPackages}
        .error=${this.packagesError}
        .versionsReady=${versionsReady}
        @package-toggle=${this._handlePackageToggle}
        @retry=${this._handleRetryPackages}
      ></t3-package-list>

      <div class="actions">
        <button class="btn-primary"
          ?disabled=${!canContinue}
          @click=${this._handleNext}>
          Continue
        </button>
      </div>
    `;
  }
}

customElements.define('step-packages', StepPackages);
