import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';
import { stepBaseStyles, formStyles, buttonStyles, spinnerStyles, srOnlyStyles, alertStyles } from './ui/shared-styles.js';
import './ui/error-help.js';
import './ui/step-actions.js';

/**
 * Database configuration step.
 * @element step-database
 */
export class StepDatabase extends LitElement {
  static properties = {
    state: { type: Object },
    testing: { type: Boolean },
    testResult: { type: Object }
  };

  static styles = [
    stepBaseStyles,
    formStyles,
    buttonStyles,
    spinnerStyles,
    srOnlyStyles,
    alertStyles,
    css`
      .actions-left {
        display: flex;
        gap: var(--spacing-md, 16px);
      }
    `
  ];

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
      const db = this.state.database;
      const config = {
        driver: db.driver,
        host: db.host,
        port: parseInt(db.port, 10),
        name: db.name,
        user: db.user,
        password: db.password
      };

      const response = await apiClient.testDatabase(config);
      this.testResult = { success: true, message: response.message || 'Connection successful!' };

      this.dispatchEvent(new CustomEvent('state-update', {
        bubbles: true,
        composed: true,
        detail: { database: { ...this.state.database, tested: true, valid: true } }
      }));
    } catch (error) {
      this.testResult = {
        success: false,
        message: error.getUserMessage?.() || error.message || 'Connection failed',
        error: { message: error.message, details: error.details }
      };

      this.dispatchEvent(new CustomEvent('state-update', {
        bubbles: true,
        composed: true,
        detail: { database: { ...this.state.database, tested: true, valid: false } }
      }));
    } finally {
      this.testing = false;
    }
  }

  _canProceed() {
    return this.state?.database?.tested && this.state?.database?.valid;
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
        <div class="alert ${this.testResult.success ? 'alert-success' : 'alert-error'}" role="alert" aria-live="polite">
          <span class="sr-only">${this.testResult.success ? 'Success:' : 'Error:'}</span>
          ${this.testResult.message}
          ${!this.testResult.success && this.testResult.error ? html`
            <t3-error-help .error=${this.testResult.error} context="database"></t3-error-help>
          ` : ''}
        </div>
      ` : ''}

      <t3-step-actions ?can-continue=${this._canProceed()}>
        <button slot="left" class="btn-secondary" @click=${this._testConnection} ?disabled=${this.testing}>
          ${this.testing ? html`<span class="spinner"></span>` : ''} Test Connection
        </button>
      </t3-step-actions>
    `;
  }
}

customElements.define('step-database', StepDatabase);
