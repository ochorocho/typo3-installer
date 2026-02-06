import { LitElement, html } from 'lit';
import { apiClient } from '../../api/client.js';
import './loading-skeleton.js';
import './section-error.js';
import './t3-icon.js';

/**
 * Displays installation environment information.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element t3-install-info
 * @fires retry - When retry button is clicked after error
 */
export class InstallInfo extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    info: { type: Object },
    loading: { type: Boolean },
    error: { type: Object },
    _phpInfoExpanded: { type: Boolean, state: true },
    _phpInfoHtml: { type: String, state: true },
    _phpInfoLoading: { type: Boolean, state: true }
  };

  constructor() {
    super();
    this._phpInfoExpanded = false;
    this._phpInfoHtml = null;
    this._phpInfoLoading = false;
  }

  async _togglePhpInfo() {
    this._phpInfoExpanded = !this._phpInfoExpanded;
    if (this._phpInfoExpanded && !this._phpInfoHtml && !this._phpInfoLoading) {
      this._phpInfoLoading = true;
      try {
        this._phpInfoHtml = await apiClient.getPhpInfo();
      } catch (error) {
        this._phpInfoHtml = `<p style="color: red; padding: 16px;">Failed to load PHP info: ${error.message}</p>`;
      } finally {
        this._phpInfoLoading = false;
      }
    }
  }

  render() {
    if (this.loading) return html`<t3-loading-skeleton height="80px">Loading environment...</t3-loading-skeleton>`;
    if (this.error) return html`<t3-section-error title="Failed to Load Environment Info" .message=${this.error.message} context="general"></t3-section-error>`;
    if (!this.info) return null;

    const { installPath, webDir, phpVersion, phpBinary, composerPath, validation } = this.info;

    return html`
      <div class="info-box">
        <div class="info-header">
          <t3-icon identifier="actions-info-circle-alt" size="medium"></t3-icon>
          <strong>Installation Environment</strong>
        </div>
        <div class="info-grid">
          <span class="info-label">Install Path:</span>
          <code class="info-value">${installPath}</code>
          <span class="info-label">Web Directory:</span>
          <code class="info-value">${webDir}</code>
          <span class="info-label">PHP Version:</span>
          <code class="info-value">${phpVersion || 'Unknown'}</code>
          ${phpBinary ? html`
            <span class="info-label">PHP Binary:</span>
            <code class="info-value">${phpBinary}</code>
          ` : ''}
          ${composerPath ? html`
            <span class="info-label">Composer Binary:</span>
            <code class="info-value">${composerPath}</code>
          ` : ''}
        </div>
        ${validation?.warnings?.length ? html`
          <div class="warnings">
            <ul>${validation.warnings.map(w => html`<li>${w}</li>`)}</ul>
          </div>
        ` : ''}

        <div class="collapsible">
          <div class="collapsible-header ${this._phpInfoExpanded ? 'expanded' : ''}" @click=${this._togglePhpInfo}>
            <t3-icon identifier="${this._phpInfoExpanded ? 'actions-caret-down' : 'actions-caret-end'}" size="small"></t3-icon>
            <span>PHP Information</span>
          </div>
          <div class="collapsible-content ${this._phpInfoExpanded ? 'expanded' : ''}">
            ${this._phpInfoLoading ? html`
              <div class="phpinfo-loading">Loading PHP information...</div>
            ` : this._phpInfoHtml ? html`
              <iframe class="phpinfo-frame" srcdoc=${this._phpInfoHtml}></iframe>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('t3-install-info', InstallInfo);
