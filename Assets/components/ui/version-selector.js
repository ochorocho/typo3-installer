import { LitElement, html, css } from 'lit';
import { hostStyles, formStyles, emit } from './shared-styles.js';
import './loading-skeleton.js';
import './section-error.js';

/**
 * Dropdown selector for TYPO3 versions.
 * @element t3-version-selector
 * @fires version-change - When version is selected, detail: { version }
 * @fires retry - When retry button is clicked after error
 */
export class VersionSelector extends LitElement {
  static properties = {
    versions: { type: Array },
    selectedVersion: { type: String, attribute: 'selected-version' },
    loading: { type: Boolean },
    error: { type: Object },
    refreshing: { type: Boolean }
  };

  static styles = [
    hostStyles,
    formStyles,
    css`
      :host { margin-bottom: var(--spacing-lg, 24px); }
      .version-box {
        display: flex;
        align-items: center;
        gap: var(--spacing-md, 16px);
        padding: var(--spacing-md, 16px);
        border: 1px solid var(--color-primary, #ff8700);
        border-radius: var(--border-radius, 4px);
      }
      .version-box label {
        white-space: nowrap;
        font-weight: 500;
        margin-bottom: 0;
      }
      .version-box select {
        flex: 1;
        max-width: 200px;
        font-size: 16px;
        font-weight: 600;
        border-width: 2px;
        cursor: pointer;
      }
      .version-info { font-size: 13px; color: var(--color-text-light, #333333); }
      .btn-refresh {
        background: transparent;
        border: 1px solid var(--color-border, #bbb);
        color: var(--color-text, #333);
        padding: var(--spacing-xs, 4px) var(--spacing-md, 16px);
        font-size: 13px;
        border-radius: var(--border-radius, 4px);
        font-weight: 500;
        cursor: pointer;
      }
      .btn-refresh:hover:not(:disabled) { background: var(--color-bg-light, #fafafa); }
      .btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }
      .btn-refresh:focus-visible { outline: 2px solid var(--color-primary, #ff8700); outline-offset: 2px; }
    `
  ];

  constructor() {
    super();
    this.versions = [];
    this.selectedVersion = '';
  }

  render() {
    if (this.loading) return html`<t3-loading-skeleton height="56px">Loading versions...</t3-loading-skeleton>`;
    if (this.error) return html`<t3-section-error title="Failed to Load Versions" message=${this.error.message}></t3-section-error>`;
    if (!this.versions.length) return null;

    return html`
      <div class="version-box">
        <label for="typo3-version">TYPO3 Version:</label>
        <select id="typo3-version" @change=${e => emit(this, 'version-change', { version: e.target.value })} .value=${this.selectedVersion}>
          ${this.versions.map(v => html`<option value=${v.version}>${v.version} (Latest: ${v.latest})</option>`)}
        </select>
        <button class="btn-refresh"
                ?disabled=${this.refreshing}
                @click=${this.refreshList}
                title="Refresh package list">
          ${this.refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
        <span class="version-info">Will install typo3/cms-core:^${this.selectedVersion}</span>
      </div>
    `;
  }

  async refreshList() {
    emit(this, 'retry');
  }
}

customElements.define('t3-version-selector', VersionSelector);
