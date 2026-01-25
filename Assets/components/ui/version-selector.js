import { LitElement, html, css } from 'lit';
import { formStyles } from './shared-styles.js';
import './loading-skeleton.js';
import './section-error.js';

/**
 * A dropdown selector for TYPO3 versions.
 *
 * @element t3-version-selector
 * @fires version-change - When a version is selected, detail: { version }
 * @fires retry - When retry button is clicked after an error
 *
 * @prop {Array} versions - Array of { version, latest } objects
 * @prop {String} selectedVersion - Currently selected version
 * @prop {Boolean} loading - Whether in loading state
 * @prop {Object} error - Error object with message property
 */
export class VersionSelector extends LitElement {
  static properties = {
    versions: { type: Array },
    selectedVersion: { type: String, attribute: 'selected-version' },
    loading: { type: Boolean },
    error: { type: Object }
  };

  static styles = [
    formStyles,
    css`
      :host {
        display: block;
        margin-bottom: var(--spacing-lg, 24px);
      }

      .version-selector {
        display: flex;
        align-items: center;
        gap: var(--spacing-md, 16px);
        padding: var(--spacing-md, 16px);
        border: 1px solid var(--color-primary, #ff8700);
        border-radius: var(--border-radius, 4px);
      }

      .version-selector label {
        white-space: nowrap;
        font-weight: 500;
        margin-bottom: 0;
      }

      .version-selector select {
        flex: 1;
        max-width: 200px;
        font-size: 16px;
        font-weight: 600;
        border: 2px solid var(--color-primary, #ff8700);
        cursor: pointer;
      }

      .version-info {
        font-size: 13px;
        color: var(--color-text-light, #666);
      }
    `
  ];

  constructor() {
    super();
    this.versions = [];
    this.selectedVersion = '';
    this.loading = false;
    this.error = null;
  }

  _handleVersionChange(e) {
    this.dispatchEvent(new CustomEvent('version-change', {
      bubbles: true,
      composed: true,
      detail: { version: e.target.value }
    }));
  }

  render() {
    if (this.loading) {
      return html`<t3-loading-skeleton height="56px">Loading versions...</t3-loading-skeleton>`;
    }

    if (this.error) {
      return html`
        <t3-section-error
          title="Failed to Load Versions"
          message=${this.error.message}
        ></t3-section-error>
      `;
    }

    if (!this.versions.length) return html``;

    const selectedInfo = this.versions.find(v => v.version === this.selectedVersion);

    return html`
      <div class="version-selector">
        <label for="typo3-version">TYPO3 Version:</label>
        <select id="typo3-version" @change=${this._handleVersionChange} .value=${this.selectedVersion}>
          ${this.versions.map(v => html`
            <option value=${v.version}>${v.version} (Latest: ${v.latest})</option>
          `)}
        </select>
        ${selectedInfo ? html`
          <span class="version-info">Will install typo3/cms-core:^${this.selectedVersion}</span>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('t3-version-selector', VersionSelector);
