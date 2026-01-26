import { LitElement, html, css } from 'lit';
import { hostStyles } from './shared-styles.js';
import { apiClient } from '../../api/client.js';
import './loading-skeleton.js';
import './section-error.js';
import './t3-icon.js';

/**
 * Displays installation environment information.
 * @element t3-install-info
 * @fires retry - When retry button is clicked after error
 */
export class InstallInfo extends LitElement {
  static properties = {
    info: { type: Object },
    loading: { type: Boolean },
    error: { type: Object },
    _phpInfoExpanded: { type: Boolean, state: true },
    _phpInfoHtml: { type: String, state: true },
    _phpInfoLoading: { type: Boolean, state: true }
  };

  static styles = [
    hostStyles,
    css`
      :host { margin-bottom: var(--spacing-lg, 24px); }
      .info-box {
        background: var(--color-info-box-bg, #e3f2fd);
        border: 1px solid var(--color-info-box-border, #90caf9);
        border-radius: var(--border-radius, 4px);
        padding: var(--spacing-md, 16px);
      }
      .info-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-md, 16px);
      }
      .info-header t3-icon { color: var(--color-info-box-accent, #1565c0); }
      .info-header strong { color: var(--color-info-box-accent, #1565c0); font-size: 14px; }
      .info-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        align-items: baseline;
      }
      .info-label { font-size: 13px; color: var(--color-info-box-label, #424242); white-space: nowrap; }
      .info-value {
        font-family: monospace;
        font-size: 13px;
        color: var(--color-info-box-value, #212121);
        background: var(--color-info-box-value-bg, rgba(255, 255, 255, 0.85));
        padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
        border-radius: 3px;
        word-break: break-all;
      }
      .warnings {
        margin-top: var(--spacing-sm, 8px);
        padding-top: var(--spacing-sm, 8px);
        border-top: 1px solid var(--color-info-box-border, rgba(144, 202, 249, 0.5));
      }
      .warnings ul { margin: 0; padding-left: var(--spacing-md, 16px); font-size: 12px; color: var(--color-warning, #e65100); }
      .collapsible {
        margin-top: var(--spacing-md, 16px);
        border-top: 1px solid var(--color-info-box-border, rgba(144, 202, 249, 0.5));
        padding-top: var(--spacing-sm, 8px);
      }
      .collapsible-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        cursor: pointer;
        padding: var(--spacing-xs, 4px) 0;
        user-select: none;
      }
      .collapsible-header:hover { opacity: 0.8; }
      .collapsible-header t3-icon {
        color: var(--color-info-box-accent, #1565c0);
      }
      .collapsible-header span {
        font-size: 13px;
        font-weight: 500;
        color: var(--color-info-box-accent, #1565c0);
      }
      .collapsible-content {
        display: none;
        margin-top: var(--spacing-sm, 8px);
      }
      .collapsible-content.expanded { display: block; }
      .phpinfo-frame {
        width: 100%;
        height: 400px;
        border: 1px solid var(--color-info-box-border, #90caf9);
        border-radius: var(--border-radius, 4px);
        background: white;
      }
      .phpinfo-loading {
        padding: var(--spacing-md, 16px);
        text-align: center;
        color: var(--color-text-light, #666);
        font-size: 13px;
      }
    `
  ];

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
    if (this.error) return html`<t3-section-error title="Failed to Load Environment Info" message=${this.error.message}></t3-section-error>`;
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
