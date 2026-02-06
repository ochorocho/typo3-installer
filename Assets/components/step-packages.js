import { LitElement, html } from 'lit';
import { apiClient } from '../api/client.js';
import { emit } from './ui/shared-styles.js';
import './ui/install-info.js';
import './ui/version-selector.js';
import './ui/package-list.js';
import './ui/step-actions.js';

/**
 * Package selection step.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element step-packages
 */
export class StepPackages extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

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
    selectedVersion: { type: String },
    // Background prefetching
    _prefetchingRequirements: { type: Boolean, state: true }
  };

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
    // Background prefetching
    this._prefetchingRequirements = false;
    this._prefetchAbortController = null;
    this._prefetchDebounceTimer = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._initializeFromStateOrFetch();
  }

  _initializeFromStateOrFetch() {
    // Check if we have cached data in state
    const hasVersions = this.state?.versions?.length > 0;
    const hasPackages = this.state?.packages?.available &&
                        Object.keys(this.state.packages.available).length > 0;
    const cachedVersion = this.state?.typo3Version;

    if (hasVersions && hasPackages && cachedVersion) {
      // Restore from state - no API calls needed for versions/packages
      this.versions = this.state.versions;
      this.selectedVersion = cachedVersion;
      this.packages = this.state.packages.available;
      this.requiredPackages = this.state.packages.required || [];
      this.selectedPackages = this.state.packages.selected || [];
      this.loadingVersions = false;
      this.loadingPackages = false;

      // Still load info (it's small and shows current server state)
      this._loadInfo();
    } else {
      // No cache - fetch everything
      this._loadData();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._cancelPrefetch();
  }

  _cancelPrefetch() {
    if (this._prefetchDebounceTimer) {
      clearTimeout(this._prefetchDebounceTimer);
      this._prefetchDebounceTimer = null;
    }
    if (this._prefetchAbortController) {
      this._prefetchAbortController.abort();
      this._prefetchAbortController = null;
    }
  }

  _schedulePrefetch() {
    this._cancelPrefetch();
    this._prefetchDebounceTimer = setTimeout(() => {
      this._prefetchRequirements();
    }, 1000);
  }

  async _prefetchRequirements() {
    if (this.selectedPackages.length === 0) return;

    this._prefetchAbortController = new AbortController();
    this._prefetchingRequirements = true;

    try {
      const [requirementsResponse, phpResponse] = await Promise.all([
        apiClient.validateRequirements(
          this.selectedPackages,
          this.selectedVersion,
          { signal: this._prefetchAbortController.signal }
        ),
        apiClient.detectPhp({ signal: this._prefetchAbortController.signal })
      ]);

      // Store results in state with metadata for freshness check
      emit(this, 'state-update', {
        requirements: {
          checked: true,
          passed: requirementsResponse.passed,
          results: requirementsResponse.requirements || [],
          prefetchedFor: {
            packages: [...this.selectedPackages],
            version: this.selectedVersion
          }
        },
        phpDetection: {
          checked: true,
          fpmVersion: phpResponse.fpmVersion,
          cliBinary: phpResponse.cliBinary,
          cliVersion: phpResponse.cliVersion,
          mismatch: phpResponse.mismatch,
          availableVersions: phpResponse.availableVersions || [],
          selectedBinary: phpResponse.mismatch ? null : phpResponse.cliBinary
        },
        packages: { ...this.state?.packages, validated: true }
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn('Background requirements check failed:', error);
      }
    } finally {
      this._prefetchingRequirements = false;
      this._prefetchAbortController = null;
    }
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
    emit(this, 'state-update', {
      typo3Version: this.selectedVersion,
      versions: this.versions,
      packages: {
        available: this.packages,
        selected: this.selectedPackages,
        required: this.requiredPackages,
        validated: false
      },
      // Mark requirements as needing recheck when packages change
      requirements: { checked: false, passed: false, results: [] }
    });

    // Schedule background prefetch
    this._schedulePrefetch();
  }

  _handleNext() {
    emit(this, 'next-step');
  }

  _handleRetryInfo() {
    this._loadInfo();
  }

  _handleRetryVersions() {
    this._loadVersions();
  }

  _handleRefresh() {
    this._loadPackages();
  }

  _handlePackagesToggleAll(event) {
    const { packageIds, selected } = event.detail;
    if (selected) {
      const newIds = packageIds.filter(id => !this.selectedPackages.includes(id));
      this.selectedPackages = [...this.selectedPackages, ...newIds];
    } else {
      const removeSet = new Set(packageIds);
      this.selectedPackages = this.selectedPackages.filter(id => !removeSet.has(id));
    }
    this._updateState();
  }

  _handleRetryPackages() {
    this._loadPackages();
  }

  render() {
    // Determine if Continue button should be disabled
    // Explicitly check all loading and error states for clarity
    const canContinue = !this.loadingVersions &&
                        !this.loadingPackages &&
                        !this.versionsError &&
                        !this.packagesError &&
                        this.versions.length > 0 &&
                        this.selectedPackages.length > 0;
    const versionsReady = !this.loadingVersions && !this.versionsError && this.versions.length > 0;

    return html`
      <t3-install-info
        .info=${this.installInfo}
        .loading=${this.loadingInfo}
        .error=${this.infoError}
        @retry=${this._handleRetryInfo}
      ></t3-install-info>

      <div class="heading-row">
        <h2>Select Packages</h2>
      </div>
      <p>Choose the TYPO3 version and packages to install. Core packages are always included automatically.</p>

      <t3-version-selector
        .versions=${this.versions}
        .selectedVersion=${this.selectedVersion}
        .loading=${this.loadingVersions}
        .error=${this.versionsError}
        .refreshing=${this.loadingPackages}
        @version-change=${this._handleVersionChange}
        @retry=${this._handleRefresh}
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
        @packages-toggle-all=${this._handlePackagesToggleAll}
        @retry=${this._handleRetryPackages}
      ></t3-package-list>

      <t3-step-actions
        ?show-back=${false}
        .canContinue=${canContinue}
      ></t3-step-actions>
    `;
  }
}

customElements.define('step-packages', StepPackages);
