import { LitElement, html } from 'lit';
import { emit } from './shared-styles.js';
import './loading-skeleton.js';
import './section-error.js';

/**
 * Dropdown selector for TYPO3 versions.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element t3-version-selector
 * @fires version-change - When version is selected, detail: { version }
 * @fires retry - When retry button is clicked after error
 */
export class VersionSelector extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    versions: { type: Array },
    selectedVersion: { type: String, attribute: 'selected-version' },
    loading: { type: Boolean },
    error: { type: Object },
    refreshing: { type: Boolean }
  };

  constructor() {
    super();
    this.versions = [];
    this.selectedVersion = '';
  }

  render() {
    if (this.loading) return html`<t3-loading-skeleton height="56px">Loading versions...</t3-loading-skeleton>`;
    if (this.error) return html`<t3-section-error title="Failed to Load Versions" .message=${this.error.message} context="general"></t3-section-error>`;
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
