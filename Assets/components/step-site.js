import { LitElement, html, css } from 'lit';
import { stepBaseStyles, formStyles, emit } from './ui/shared-styles.js';
import { isValidUrl, isValidSiteName, getSiteNameError, getUrlError } from '../utils/validators.js';
import { canStartInstallation } from '../utils/step-validators.js';
import './ui/step-actions.js';

/**
 * Site configuration step with installation summary.
 * @element step-site
 */
export class StepSite extends LitElement {
  static properties = {
    state: { type: Object },
    errors: { type: Object },
    touched: { type: Object }
  };

  static styles = [
    stepBaseStyles,
    formStyles,
    css`
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

  constructor() {
    super();
    this.errors = {};
    this.touched = {};
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.state?.site?.baseUrl) {
      emit(this, 'state-update', { site: { ...this.state?.site, baseUrl: window.location.origin } });
    }
    // Validate existing state on load
    this._validateOnLoad();
  }

  _validateOnLoad() {
    const site = this.state?.site;
    if (!site) return;

    // Validate all fields that have values
    if (site.name !== undefined && site.name !== '') {
      this.touched = { ...this.touched, name: true };
      this._validate('name', site.name);
    }
    if (site.baseUrl !== undefined && site.baseUrl !== '') {
      this.touched = { ...this.touched, baseUrl: true };
      this._validate('baseUrl', site.baseUrl);
    }
  }

  _update(field, value) {
    emit(this, 'state-update', { site: { ...this.state.site, [field]: value } });
    this._validate(field, value);
  }

  _blur(field) {
    this.touched = { ...this.touched, [field]: true };
    this._validate(field, this.state?.site?.[field]);
  }

  _validate(field, value) {
    const validators = {
      name: getSiteNameError,
      baseUrl: (v) => getUrlError(v, true)
    };
    const error = validators[field]?.(value);
    this.errors = error ? { ...this.errors, [field]: error } : (delete this.errors[field], { ...this.errors });
  }

  _validateAll() {
    // Use centralized step validation
    return canStartInstallation(this.state);
  }

  render() {
    const { site = {}, database: db = {}, admin = {}, packages = {} } = this.state || {};
    const drivers = { pdo_mysql: 'MySQL / MariaDB', pdo_pgsql: 'PostgreSQL' };
    const canProceed = this._validateAll();

    return html`
      <h2>Site Configuration</h2>
      <p>Configure your TYPO3 site settings and review the installation summary.</p>

      <div class="form-group">
        <label for="siteName" class="required">Site Name</label>
        <input type="text" id="siteName" required
          class=${this.touched.name && this.errors.name ? 'error' : ''}
          aria-invalid=${this.touched.name && this.errors.name ? 'true' : 'false'}
          .value=${site.name || ''}
          @input=${e => this._update('name', e.target.value)}
          @blur=${() => this._blur('name')}
          placeholder="My TYPO3 Site">
        ${this.touched.name && this.errors.name
          ? html`<div class="error-text" role="alert">${this.errors.name}</div>`
          : html`<span class="help-text">The name of your website</span>`}
      </div>

      <div class="form-group">
        <label for="baseUrl" class="required">Base URL</label>
        <input type="text" id="baseUrl" required
          class=${this.touched.baseUrl && this.errors.baseUrl ? 'error' : ''}
          aria-invalid=${this.touched.baseUrl && this.errors.baseUrl ? 'true' : 'false'}
          .value=${site.baseUrl || ''}
          @input=${e => this._update('baseUrl', e.target.value)}
          @blur=${() => this._blur('baseUrl')}
          placeholder="https://example.com">
        ${this.touched.baseUrl && this.errors.baseUrl
          ? html`<div class="error-text" role="alert">${this.errors.baseUrl}</div>`
          : html`<span class="help-text">The URL where your site will be accessible</span>`}
      </div>

      <div class="summary">
        <h3>Installation Summary</h3>
        ${[
          ['Packages', `${packages.selected?.length || 0} packages selected`],
          ['Database Type', drivers[db.driver] || db.driver],
          ['Database', `${db.user}@${db.host}:${db.port}/${db.name}`],
          ['Admin User', admin.username],
          ['Admin Email', admin.email || '(not provided)'],
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
