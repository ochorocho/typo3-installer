import { LitElement, html, css } from 'lit';
import { stepBaseStyles, formStyles } from './ui/shared-styles.js';
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

      .summary h3 { margin: 0 0 var(--spacing-md, 16px) 0; }

      .summary-item {
        display: flex;
        padding: var(--spacing-sm, 8px) 0;
        border-bottom: 1px solid var(--color-border, #ddd);
      }

      .summary-item:last-child { border-bottom: none; }

      .summary-label {
        width: 150px;
        font-weight: 600;
        color: var(--color-text-light, #666);
      }

      .summary-value {
        flex: 1;
        color: var(--color-secondary, #1a1a1a);
      }
    `
  ];

  connectedCallback() {
    super.connectedCallback();
    if (!this.state?.site?.baseUrl) {
      this._handleInput('baseUrl', window.location.origin);
    }
  }

  _handleInput(field, value) {
    this.dispatchEvent(new CustomEvent('state-update', {
      bubbles: true,
      composed: true,
      detail: { site: { ...this.state.site, [field]: value } }
    }));
  }

  _canProceed() {
    const site = this.state?.site || {};
    return site.name?.length > 0 && site.baseUrl?.length > 0;
  }

  _getDriverLabel(driver) {
    const labels = { pdo_mysql: 'MySQL / MariaDB', pdo_pgsql: 'PostgreSQL' };
    return labels[driver] || driver;
  }

  render() {
    const site = this.state?.site || {};
    const db = this.state?.database || {};
    const admin = this.state?.admin || {};
    const packages = this.state?.packages?.selected || [];

    return html`
      <h2>Site Configuration</h2>
      <p>Configure your TYPO3 site settings and review the installation summary.</p>

      <div class="form-group">
        <label for="siteName">Site Name</label>
        <input
          type="text"
          id="siteName"
          .value=${site.name || ''}
          @input=${(e) => this._handleInput('name', e.target.value)}
          placeholder="My TYPO3 Site"
        >
        <span class="help-text">The name of your website</span>
      </div>

      <div class="form-group">
        <label for="baseUrl">Base URL</label>
        <input
          type="text"
          id="baseUrl"
          .value=${site.baseUrl || ''}
          @input=${(e) => this._handleInput('baseUrl', e.target.value)}
          placeholder="https://example.com"
        >
        <span class="help-text">The URL where your site will be accessible</span>
      </div>

      <div class="summary">
        <h3>Installation Summary</h3>
        <div class="summary-item">
          <div class="summary-label">Packages</div>
          <div class="summary-value">${packages.length} packages selected</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Database Type</div>
          <div class="summary-value">${this._getDriverLabel(db.driver)}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Database</div>
          <div class="summary-value">${db.user}@${db.host}:${db.port}/${db.name}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Admin User</div>
          <div class="summary-value">${admin.username}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Admin Email</div>
          <div class="summary-value">${admin.email}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Site Name</div>
          <div class="summary-value">${site.name || '-'}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Base URL</div>
          <div class="summary-value">${site.baseUrl || '-'}</div>
        </div>
      </div>

      <t3-step-actions
        ?can-continue=${this._canProceed()}
        continue-text="Start Installation"
        continue-variant="success"
      ></t3-step-actions>
    `;
  }
}

customElements.define('step-site', StepSite);
