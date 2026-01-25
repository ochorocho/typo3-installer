import { LitElement, html, css } from 'lit';
import { stepBaseStyles, formStyles, emit } from './ui/shared-styles.js';
import './ui/step-actions.js';

/**
 * Site configuration step with installation summary.
 * @element step-site
 */
export class StepSite extends LitElement {
  static properties = {
    state: { type: Object }
  };

  static styles = [
    stepBaseStyles,
    formStyles,
    css`
      .summary {
        border-radius: var(--border-radius, 4px);
        padding: var(--spacing-lg, 24px);
        margin-top: var(--spacing-xl, 32px);
      }
      .summary h3 { margin: 0 0 var(--spacing-md, 16px); }
      .summary-item {
        display: flex;
        padding: var(--spacing-sm, 8px) 0;
        border-bottom: 1px solid var(--color-border, #ddd);
      }
      .summary-item:last-child { border-bottom: none; }
      .summary-label { width: 150px; font-weight: 600; color: var(--color-text-light, #666); }
      .summary-value { flex: 1; color: var(--color-secondary, #1a1a1a); }
    `
  ];

  connectedCallback() {
    super.connectedCallback();
    if (!this.state?.site?.baseUrl) {
      emit(this, 'state-update', { site: { ...this.state?.site, baseUrl: window.location.origin } });
    }
  }

  _update(field, value) {
    emit(this, 'state-update', { site: { ...this.state.site, [field]: value } });
  }

  render() {
    const { site = {}, database: db = {}, admin = {}, packages = {} } = this.state || {};
    const drivers = { pdo_mysql: 'MySQL / MariaDB', pdo_pgsql: 'PostgreSQL' };
    const canProceed = site.name?.length > 0 && site.baseUrl?.length > 0;

    return html`
      <h2>Site Configuration</h2>
      <p>Configure your TYPO3 site settings and review the installation summary.</p>

      <div class="form-group">
        <label for="siteName">Site Name</label>
        <input type="text" id="siteName" .value=${site.name || ''} @input=${e => this._update('name', e.target.value)} placeholder="My TYPO3 Site">
        <span class="help-text">The name of your website</span>
      </div>

      <div class="form-group">
        <label for="baseUrl">Base URL</label>
        <input type="text" id="baseUrl" .value=${site.baseUrl || ''} @input=${e => this._update('baseUrl', e.target.value)} placeholder="https://example.com">
        <span class="help-text">The URL where your site will be accessible</span>
      </div>

      <div class="summary">
        <h3>Installation Summary</h3>
        ${[
          ['Packages', `${packages.selected?.length || 0} packages selected`],
          ['Database Type', drivers[db.driver] || db.driver],
          ['Database', `${db.user}@${db.host}:${db.port}/${db.name}`],
          ['Admin User', admin.username],
          ['Admin Email', admin.email],
          ['Site Name', site.name || '-'],
          ['Base URL', site.baseUrl || '-']
        ].map(([label, value]) => html`
          <div class="summary-item"><div class="summary-label">${label}</div><div class="summary-value">${value}</div></div>
        `)}
      </div>

      <t3-step-actions ?can-continue=${canProceed} continue-text="Start Installation" continue-variant="success"></t3-step-actions>
    `;
  }
}

customElements.define('step-site', StepSite);
