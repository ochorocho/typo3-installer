import { LitElement, html } from 'lit';
import { emit } from './ui/shared-styles.js';
import {
  isValidUsername,
  getUsernameError,
  isValidPassword,
  getPasswordError,
  getPasswordStrength,
  isValidEmail,
  getEmailError,
  isValidAdmin
} from '../utils/validators.js';
import './ui/step-actions.js';

/**
 * Admin account configuration step.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element step-admin
 */
export class StepAdmin extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    state: { type: Object },
    errors: { type: Object },
    touched: { type: Object }
  };

  constructor() {
    super();
    this.errors = {};
    this.touched = {};
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('force-validate', this._handleForceValidate);
    // Validate existing state on load (e.g., from sessionStorage or navigation)
    this._validateOnLoad();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('force-validate', this._handleForceValidate);
  }

  _handleForceValidate = () => {
    this.touched = { username: true, password: true, email: true };
    const admin = this.state?.admin || {};
    this._validate('username', admin.username);
    this._validate('password', admin.password);
    this._validate('email', admin.email);
  };

  _validateOnLoad() {
    const admin = this.state?.admin;
    if (!admin) return;

    // Validate all fields that have values to populate errors
    ['username', 'password', 'email'].forEach(field => {
      if (admin[field] !== undefined && admin[field] !== '') {
        this.touched = { ...this.touched, [field]: true };
        this._validate(field, admin[field]);
      }
    });
  }

  _update(field, value) {
    emit(this, 'state-update', { admin: { ...this.state.admin, [field]: value } });
    this._validate(field, value);
  }

  _blur(field) {
    this.touched = { ...this.touched, [field]: true };
    this._validate(field, this.state.admin[field]);
  }

  _validate(field, value) {
    const validators = {
      username: getUsernameError,
      password: getPasswordError,
      email: getEmailError
    };
    const error = validators[field]?.(value);
    this.errors = error ? { ...this.errors, [field]: error } : (delete this.errors[field], { ...this.errors });
  }

  _getStrength(password) {
    return getPasswordStrength(password);
  }

  _canProceed() {
    return isValidAdmin(this.state?.admin);
  }

  _field(id, label, type, value, helpText, autocomplete, required = false) {
    const hasError = this.touched[id] && this.errors[id];
    const descId = `${id}-desc`;
    return html`
      <div class="form-group">
        <label for=${id} class=${required ? 'required' : ''}>${label}</label>
        <input type=${type} id=${id} class=${hasError ? 'error' : ''} aria-invalid=${hasError ? 'true' : 'false'}
          aria-describedby=${descId}
          ?required=${required} .value=${value || ''} @input=${e => this._update(id, e.target.value)} @blur=${() => this._blur(id)} autocomplete=${autocomplete}>
        ${hasError ? html`<div id=${descId} class="error-text" role="alert">${this.errors[id]}</div>` : html`<div id=${descId} class="help-text">${helpText}</div>`}
      </div>
    `;
  }

  render() {
    const admin = this.state?.admin || {};
    const strength = this._getStrength(admin.password);

    return html`
      <h2>Admin Account</h2>
      <p>Create the administrator account for your TYPO3 installation.</p>

      ${this._field('username', 'Username', 'text', admin.username, 'Minimum 3 characters', 'username', true)}

      <div class="form-group">
        <label for="password" class="required">Password</label>
        <input type="password" id="password" class=${this.touched.password && this.errors.password ? 'error' : ''}
          aria-invalid=${this.touched.password && this.errors.password ? 'true' : 'false'}
          aria-describedby="password-desc"
          required .value=${admin.password || ''} @input=${e => this._update('password', e.target.value)}
          @blur=${() => this._blur('password')} autocomplete="new-password">
        ${admin.password ? html`
          <div class="password-strength" aria-live="polite">
            <div class="password-strength-bar"><div class="password-strength-fill ${strength.level}"></div></div>
            <div class="password-strength-label ${strength.level}">Password strength: ${strength.label}</div>
          </div>
        ` : ''}
        ${this.touched.password && this.errors.password
          ? html`<div id="password-desc" class="error-text" role="alert">${this.errors.password}</div>`
          : html`<div id="password-desc" class="help-text">Minimum 8 characters with uppercase, lowercase, and number</div>`}
      </div>

      ${this._field('email', 'Email', 'email', admin.email, 'Used for password recovery and notifications', 'email', true)}

      <t3-step-actions .canContinue=${this._canProceed()}></t3-step-actions>
    `;
  }
}

customElements.define('step-admin', StepAdmin);
