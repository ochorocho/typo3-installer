import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';
import { stepBaseStyles, formStyles, buttonStyles, srOnlyStyles, alertStyles, emit } from './ui/shared-styles.js';
import { debounce } from '../utils/helpers.js';
import './ui/error-help.js';
import './ui/step-actions.js';
import './ui/spinner.js';

/**
 * Database configuration step.
 * @element step-database
 */
export class StepDatabase extends LitElement {
  static properties = {
    state: { type: Object },
    testing: { type: Boolean },
    testResult: { type: Object },
    availableDrivers: { type: Array },
    driversLoading: { type: Boolean },
    driversError: { type: Object }
  };

  static styles = [
    stepBaseStyles,
    formStyles,
    buttonStyles,
    srOnlyStyles,
    alertStyles
  ];

  constructor() {
    super();
    this.testing = false;
    this.testResult = null;
    this.availableDrivers = [];
    this.driversLoading = true;
    this.driversError = null;
    this._debouncedAutoValidate = debounce(() => this._autoValidate(), 800);
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadDrivers();
  }

  async _loadDrivers() {
    this.driversLoading = true;
    this.driversError = null;
    try {
      const response = await apiClient.getDatabaseDrivers();
      this.availableDrivers = response.drivers || [];

      // Set default driver if current driver is not available
      if (this.availableDrivers.length > 0) {
        const currentDriver = this.state?.database?.driver;
        const isCurrentDriverAvailable = this.availableDrivers.some(d => d.value === currentDriver);
        if (!isCurrentDriverAvailable) {
          const defaultDriver = this.availableDrivers[0];
          emit(this, 'state-update', {
            database: {
              ...this.state.database,
              driver: defaultDriver.value,
              port: String(defaultDriver.defaultPort || 3306)
            }
          });
        }

        // Trigger auto-validation if state was restored from sessionStorage
        this._autoValidate();
      }
    } catch (error) {
      this.driversError = {
        message: error.getUserMessage?.() || error.message || 'Failed to detect database drivers'
      };
    } finally {
      this.driversLoading = false;
    }
  }

  _update(field, value) {
    this.testResult = null;
    const updates = { [field]: value, tested: false, valid: false };

    // Update default port when driver changes
    if (field === 'driver') {
      const driver = this.availableDrivers.find(d => d.value === value);
      if (driver?.defaultPort) {
        updates.port = String(driver.defaultPort);
      }
      // Clear server-related fields when switching to file-based driver
      if (driver?.defaultPort === null) {
        updates.host = '';
        updates.port = '';
        updates.user = '';
        updates.password = '';
      }
    }

    emit(this, 'state-update', { database: { ...this.state.database, ...updates } });
    this._debouncedAutoValidate();
  }

  async _testConnection() {
    this.testing = true;
    this.testResult = null;

    try {
      const db = this.state.database;
      const response = await apiClient.testDatabase({
        driver: db.driver, host: db.host, port: parseInt(db.port, 10),
        name: db.name, user: db.user, password: db.password
      });
      this.testResult = { success: true, message: response.message || 'Connection successful!' };
      emit(this, 'state-update', { database: { ...this.state.database, tested: true, valid: true } });
    } catch (error) {
      this.testResult = {
        success: false,
        message: error.getUserMessage?.() || error.message || 'Connection failed',
        error: { message: error.message, details: error.details }
      };
      emit(this, 'state-update', { database: { ...this.state.database, tested: true, valid: false } });
    } finally {
      this.testing = false;
    }
  }

  _isFileBasedDriver() {
    const driver = this.availableDrivers.find(d => d.value === this.state?.database?.driver);
    return driver?.defaultPort === null;
  }

  /**
   * Checks if all required fields are filled and triggers validation.
   * Required fields depend on driver type:
   * - Server-based (MySQL/PostgreSQL): host, name, user
   * - File-based (SQLite): only name
   */
  _autoValidate() {
    const db = this.state?.database;
    if (!db || this.testing) return;

    const isFileBased = this._isFileBasedDriver();
    const hasRequiredFields = isFileBased
      ? db.name?.trim()
      : db.host?.trim() && db.name?.trim() && db.user?.trim();

    if (hasRequiredFields) {
      this._testConnection();
    }
  }

  _getPortHelpText() {
    const driver = this.availableDrivers.find(d => d.value === this.state?.database?.driver);
    if (!driver?.defaultPort) return 'Database server port';
    return `Default: ${driver.defaultPort}`;
  }

  _renderConnectionStatus() {
    const db = this.state?.database || {};
    if (this.testing) {
      return html`<div class="alert alert-warning" role="status">Testing connection...</div>`;
    }
    if (db.tested && db.valid) {
      return html`<div class="alert alert-success" role="status">Connection verified</div>`;
    }
    if (db.tested && !db.valid) {
      return ''; // existing testResult error handles this
    }
    return html`<div class="alert alert-warning" role="status">Connection not tested yet. Complete all required fields to auto-test.</div>`;
  }

  render() {
    const db = this.state?.database || {};
    const isFileBased = this._isFileBasedDriver();

    return html`
      <h2>Database Configuration</h2>
      <p>Configure your database connection for TYPO3.</p>

      <div class="form-group">
        <label for="driver">Database Type</label>
        ${this.driversLoading ? html`
          <select id="driver" disabled>
            <option>Loading available drivers...</option>
          </select>
        ` : this.driversError ? html`
          <select id="driver" disabled>
            <option>Failed to load drivers</option>
          </select>
          <span class="help-text" style="color: var(--color-error, #c83c3c);">${this.driversError.message}</span>
        ` : this.availableDrivers.length === 0 ? html`
          <select id="driver" disabled>
            <option>No database drivers available</option>
          </select>
          <span class="help-text" style="color: var(--color-error, #c83c3c);">No supported database extensions found. Install mysqli, pdo_mysql, or pdo_pgsql.</span>
        ` : html`
          <select id="driver" .value=${db.driver} @change=${e => this._update('driver', e.target.value)}>
            ${this.availableDrivers.map(driver => html`
              <option value=${driver.value} ?selected=${db.driver === driver.value}>${driver.label}</option>
            `)}
          </select>
        `}
      </div>

      ${!isFileBased ? html`
        <div class="form-row">
          <div class="form-group">
            <label for="host" class="required">Host</label>
            <input type="text" id="host" required .value=${db.host} @input=${e => this._update('host', e.target.value)} placeholder="localhost">
            <span class="help-text">Database server hostname or IP</span>
          </div>
          <div class="form-group">
            <label for="port">Port</label>
            <input type="text" id="port" .value=${db.port} @input=${e => this._update('port', e.target.value)} placeholder=${this.availableDrivers.find(d => d.value === db.driver)?.defaultPort || '3306'}>
            <span class="help-text">${this._getPortHelpText()}</span>
          </div>
        </div>
      ` : ''}

      <div class="form-group">
        <label for="name" class="required">${isFileBased ? 'Database File Path' : 'Database Name'}</label>
        <input type="text" id="name" required .value=${db.name} @input=${e => this._update('name', e.target.value)} placeholder=${isFileBased ? '/path/to/database.sqlite' : 'typo3'}>
        <span class="help-text">${isFileBased ? 'Path to the SQLite database file' : 'The database must already exist'}</span>
      </div>

      ${!isFileBased ? html`
        <div class="form-row">
          <div class="form-group">
            <label for="user" class="required">Username</label>
            <input type="text" id="user" required .value=${db.user} @input=${e => this._update('user', e.target.value)} placeholder="root">
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" .value=${db.password} @input=${e => this._update('password', e.target.value)}>
          </div>
        </div>
      ` : ''}

      ${this._renderConnectionStatus()}

      ${this.testResult ? html`
        <div class="alert ${this.testResult.success ? 'alert-success' : 'alert-error'}" role="alert" aria-live="polite">
          <span class="sr-only">${this.testResult.success ? 'Success:' : 'Error:'}</span>
          ${this.testResult.message}
          ${!this.testResult.success && this.testResult.error ? html`
            <t3-error-help .error=${this.testResult.error} context="database"></t3-error-help>
          ` : ''}
        </div>
      ` : ''}

      <t3-step-actions .canContinue=${!this.driversLoading && !this.driversError && this.availableDrivers.length > 0 && this.state?.database?.tested && this.state?.database?.valid}>
        <button slot="left" class="btn-secondary" @click=${this._testConnection} ?disabled=${this.testing || this.driversLoading || this.driversError || this.availableDrivers.length === 0}>
          ${this.testing ? html`<ui-spinner size="small">Test Connection</ui-spinner>` : 'Test Connection'}
        </button>
      </t3-step-actions>
    `;
  }
}

customElements.define('step-database', StepDatabase);
