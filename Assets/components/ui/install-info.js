import { LitElement, html, css } from 'lit';
import './loading-skeleton.js';
import './section-error.js';

/**
 * Displays installation environment information.
 *
 * @element t3-install-info
 * @fires retry - When the retry button is clicked after an error
 *
 * @prop {Object} info - Installation info with installPath, webDir, phpVersion, etc.
 * @prop {Boolean} loading - Whether in loading state
 * @prop {Object} error - Error object with message property
 */
export class InstallInfo extends LitElement {
  static properties = {
    info: { type: Object },
    loading: { type: Boolean },
    error: { type: Object }
  };

  static styles = css`
    :host {
      display: block;
      margin-bottom: var(--spacing-lg, 24px);
    }

    .install-info {
      background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
      border: 1px solid #90caf9;
      border-radius: var(--border-radius, 4px);
      padding: var(--spacing-md, 16px);
    }

    .install-info-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm, 8px);
      margin-bottom: var(--spacing-md, 16px);
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

    .install-info-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: var(--spacing-sm, 8px) var(--spacing-md, 16px);
      align-items: baseline;
    }

    .install-info-label {
      font-size: 13px;
      color: #666;
      white-space: nowrap;
    }

    .install-info-value {
      font-family: monospace;
      font-size: 13px;
      color: #333;
      background: rgba(255, 255, 255, 0.7);
      padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
      border-radius: 3px;
      word-break: break-all;
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
  `;

  constructor() {
    super();
    this.info = null;
    this.loading = false;
    this.error = null;
  }

  render() {
    if (this.loading) {
      return html`<t3-loading-skeleton height="80px">Loading environment...</t3-loading-skeleton>`;
    }

    if (this.error) {
      return html`
        <t3-section-error
          title="Failed to Load Environment Info"
          message=${this.error.message}
        ></t3-section-error>
      `;
    }

    if (!this.info) return html``;

    return html`
      <div class="install-info">
        <div class="install-info-header">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
          <strong>Installation Environment</strong>
        </div>
        <div class="install-info-grid">
          <span class="install-info-label">Install Path:</span>
          <code class="install-info-value">${this.info.installPath}</code>
          <span class="install-info-label">Web Directory:</span>
          <code class="install-info-value">${this.info.webDir}</code>
          <span class="install-info-label">PHP Version:</span>
          <code class="install-info-value">${this.info.phpVersion || 'Unknown'}</code>
          ${this.info.phpBinary ? html`
            <span class="install-info-label">PHP Binary:</span>
            <code class="install-info-value">${this.info.phpBinary}</code>
          ` : ''}
          ${this.info.composerPath ? html`
            <span class="install-info-label">Composer Binary:</span>
            <code class="install-info-value">${this.info.composerPath}</code>
          ` : ''}
        </div>
        ${this.info.validation?.warnings?.length > 0 ? html`
          <div class="install-info-warnings">
            <ul>${this.info.validation.warnings.map(w => html`<li>${w}</li>`)}</ul>
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('t3-install-info', InstallInfo);
