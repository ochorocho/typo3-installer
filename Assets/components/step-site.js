import { LitElement, html, css } from 'lit';

export class StepSite extends LitElement {
  static properties = {
    state: { type: Object }
  };

  static styles = css`
    :host {
      display: block;
    }

    h2 {
      margin: 0 0 var(--spacing-md, 16px) 0;
      color: var(--color-secondary, #1a1a1a);
    }

    p {
      color: var(--color-text-light, #666);
      margin-bottom: var(--spacing-lg, 24px);
    }

    .form-group {
      margin-bottom: var(--spacing-md, 16px);
    }

    label {
      display: block;
      font-weight: 600;
      margin-bottom: var(--spacing-xs, 4px);
      color: var(--color-secondary, #1a1a1a);
    }

    input {
      width: 100%;
      padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
      border: 1px solid var(--color-border, #ddd);
      border-radius: var(--border-radius, 4px);
      font-size: 16px;
      transition: border-color 0.2s ease;
    }

    input:focus {
      outline: none;
      border-color: var(--color-primary, #ff8700);
    }

    .help-text {
      font-size: 12px;
      color: var(--color-text-light, #666);
      margin-top: var(--spacing-xs, 4px);
    }

    .summary {
      background: var(--color-bg, #f5f5f5);
      border-radius: var(--border-radius, 4px);
      padding: var(--spacing-lg, 24px);
      margin-top: var(--spacing-xl, 32px);
    }

    .summary h3 {
      margin: 0 0 var(--spacing-md, 16px) 0;
      color: var(--color-secondary, #1a1a1a);
    }

    .summary-item {
      display: flex;
      padding: var(--spacing-sm, 8px) 0;
      border-bottom: 1px solid var(--color-border, #ddd);
    }

    .summary-item:last-child {
      border-bottom: none;
    }

    .summary-label {
      width: 150px;
      font-weight: 600;
      color: var(--color-text-light, #666);
    }

    .summary-value {
      flex: 1;
      color: var(--color-secondary, #1a1a1a);
    }

    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md, 16px);
      margin-top: var(--spacing-lg, 24px);
    }

    button {
      padding: var(--spacing-sm, 8px) var(--spacing-lg, 24px);
      border: none;
      border-radius: var(--border-radius, 4px);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-success {
      background: var(--color-success, #4caf50);
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #43a047;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--color-border, #ddd);
      color: var(--color-text, #333);
    }

    .btn-outline:hover:not(:disabled) {
      background: var(--color-bg, #f5f5f5);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Auto-detect base URL if not set
    if (!this.state?.site?.baseUrl) {
      const baseUrl = window.location.origin;
      this._handleInput('baseUrl', baseUrl);
    }
  }

  _handleInput(field, value) {
    const site = { ...this.state.site, [field]: value };
    this.dispatchEvent(new CustomEvent('state-update', {
      bubbles: true,
      composed: true,
      detail: { site }
    }));
  }

  _canProceed() {
    const site = this.state?.site || {};
    return site.name?.length > 0 && site.baseUrl?.length > 0;
  }

  _handlePrevious() {
    this.dispatchEvent(new CustomEvent('previous-step', { bubbles: true, composed: true }));
  }

  _handleNext() {
    this.dispatchEvent(new CustomEvent('next-step', { bubbles: true, composed: true }));
  }

  _getDriverLabel(driver) {
    switch (driver) {
      case 'pdo_mysql': return 'MySQL / MariaDB';
      case 'pdo_pgsql': return 'PostgreSQL';
      default: return driver;
    }
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

      <div class="actions">
        <button class="btn-outline" @click=${this._handlePrevious}>Back</button>
        <button class="btn-success" @click=${this._handleNext} ?disabled=${!this._canProceed()}>
          Start Installation
        </button>
      </div>
    `;
  }
}

customElements.define('step-site', StepSite);
