import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';

export class StepDatabase extends LitElement {
  static properties = {
    state: { type: Object },
    testing: { type: Boolean },
    testResult: { type: Object }
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

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-md, 16px);
    }

    label {
      display: block;
      font-weight: 600;
      margin-bottom: var(--spacing-xs, 4px);
      color: var(--color-secondary, #1a1a1a);
    }

    input, select {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid var(--color-border, #bbb);
      border-radius: var(--border-radius, 4px);
      font-size: 14px;
      background: var(--color-bg-white, #fff);
    }

    input:focus, select:focus {
      outline: none;
      border-color: var(--color-primary, #ff8700);
      box-shadow: 0 0 0 3px rgba(255, 135, 0, 0.15);
    }

    input:focus-visible, select:focus-visible {
      outline: 2px solid var(--color-primary, #ff8700);
      outline-offset: 2px;
    }

    .help-text {
      font-size: 12px;
      color: var(--color-text-light, #666);
      margin-top: var(--spacing-xs, 4px);
    }

    .test-result {
      padding: var(--spacing-md, 16px);
      border-radius: var(--border-radius, 4px);
      margin-bottom: var(--spacing-lg, 24px);
    }

    .test-result.success {
      background: #e8f5e9;
      color: var(--color-success, #1cb841);
      border: 1px solid var(--color-success, #1cb841);
    }

    .test-result.error {
      background: #ffebee;
      color: var(--color-error, #c83c3c);
      border: 1px solid var(--color-error, #c83c3c);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: var(--spacing-md, 16px);
      margin-top: var(--spacing-lg, 24px);
    }

    .actions-left {
      display: flex;
      gap: var(--spacing-md, 16px);
    }

    button {
      padding: var(--spacing-sm, 8px) var(--spacing-lg, 24px);
      border: none;
      border-radius: var(--border-radius, 4px);
      font-weight: 500;
      cursor: pointer;
    }

    button:focus-visible {
      outline: 2px solid var(--color-primary, #ff8700);
      outline-offset: 2px;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: var(--color-primary, #ff8700);
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #e67a00;
    }

    .btn-secondary {
      background: var(--color-info, #2196f3);
      color: white;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #1976d2;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid var(--color-border, #ddd);
      color: var(--color-text, #333);
    }

    .btn-outline:hover:not(:disabled) {
      background: var(--color-bg, #f5f5f5);
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
      margin-right: var(--spacing-sm, 8px);
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  constructor() {
    super();
    this.testing = false;
    this.testResult = null;
  }

  _handleInput(field, value) {
    const database = { ...this.state.database, [field]: value, tested: false, valid: false };
    this.testResult = null;
    this.dispatchEvent(new CustomEvent('state-update', {
      bubbles: true,
      composed: true,
      detail: { database }
    }));
  }

  async _testConnection() {
    this.testing = true;
    this.testResult = null;

    try {
      const config = {
        driver: this.state.database.driver,
        host: this.state.database.host,
        port: parseInt(this.state.database.port, 10),
        name: this.state.database.name,
        user: this.state.database.user,
        password: this.state.database.password
      };

      const response = await apiClient.testDatabase(config);

      this.testResult = { success: true, message: response.message || 'Connection successful!' };

      this.dispatchEvent(new CustomEvent('state-update', {
        bubbles: true,
        composed: true,
        detail: {
          database: { ...this.state.database, tested: true, valid: true }
        }
      }));
    } catch (error) {
      this.testResult = { success: false, message: error.message || 'Connection failed' };

      this.dispatchEvent(new CustomEvent('state-update', {
        bubbles: true,
        composed: true,
        detail: {
          database: { ...this.state.database, tested: true, valid: false }
        }
      }));
    } finally {
      this.testing = false;
    }
  }

  _canProceed() {
    return this.state?.database?.tested && this.state?.database?.valid;
  }

  _handlePrevious() {
    this.dispatchEvent(new CustomEvent('previous-step', { bubbles: true, composed: true }));
  }

  _handleNext() {
    this.dispatchEvent(new CustomEvent('next-step', { bubbles: true, composed: true }));
  }

  render() {
    const db = this.state?.database || {};

    return html`
      <h2>Database Configuration</h2>
      <p>Configure your database connection for TYPO3.</p>

      <div class="form-group">
        <label for="driver">Database Type</label>
        <select id="driver" .value=${db.driver} @change=${(e) => this._handleInput('driver', e.target.value)}>
          <option value="pdo_mysql">MySQL / MariaDB</option>
          <option value="pdo_pgsql">PostgreSQL</option>
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="host">Host</label>
          <input type="text" id="host" .value=${db.host} @input=${(e) => this._handleInput('host', e.target.value)} placeholder="localhost">
          <span class="help-text">Database server hostname or IP</span>
        </div>
        <div class="form-group">
          <label for="port">Port</label>
          <input type="text" id="port" .value=${db.port} @input=${(e) => this._handleInput('port', e.target.value)} placeholder="3306">
          <span class="help-text">Default: 3306 (MySQL) or 5432 (PostgreSQL)</span>
        </div>
      </div>

      <div class="form-group">
        <label for="name">Database Name</label>
        <input type="text" id="name" .value=${db.name} @input=${(e) => this._handleInput('name', e.target.value)} placeholder="typo3">
        <span class="help-text">The database must already exist</span>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="user">Username</label>
          <input type="text" id="user" .value=${db.user} @input=${(e) => this._handleInput('user', e.target.value)} placeholder="root">
        </div>
        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" .value=${db.password} @input=${(e) => this._handleInput('password', e.target.value)}>
        </div>
      </div>

      ${this.testResult ? html`
        <div class="test-result ${this.testResult.success ? 'success' : 'error'}" role="alert" aria-live="polite">
          <span class="sr-only">${this.testResult.success ? 'Success:' : 'Error:'}</span>
          ${this.testResult.message}
        </div>
      ` : ''}

      <div class="actions">
        <div class="actions-left">
          <button class="btn-outline" @click=${this._handlePrevious}>Back</button>
          <button class="btn-secondary" @click=${this._testConnection} ?disabled=${this.testing}>
            ${this.testing ? html`<span class="spinner"></span>` : ''} Test Connection
          </button>
        </div>
        <button class="btn-primary" @click=${this._handleNext} ?disabled=${!this._canProceed()}>
          Continue
        </button>
      </div>
    `;
  }
}

customElements.define('step-database', StepDatabase);
