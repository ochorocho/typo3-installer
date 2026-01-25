import { LitElement, html, css } from 'lit';
import { stepBaseStyles, formStyles } from './ui/shared-styles.js';
import './ui/step-actions.js';

/**
 * Admin account configuration step.
 * @element step-admin
 */
export class StepAdmin extends LitElement {
  static properties = {
    state: { type: Object },
    errors: { type: Object },
    touched: { type: Object }
  };

  static styles = [
    stepBaseStyles,
    formStyles,
    css`
      .password-strength { margin-top: var(--spacing-sm, 8px); }

      .password-strength-bar {
        height: 4px;
        background: var(--color-border, #ddd);
        border-radius: 2px;
        overflow: hidden;
      }

      .password-strength-fill { height: 100%; }
      .password-strength-fill.weak { width: 33%; background: var(--color-error, #c83c3c); }
      .password-strength-fill.medium { width: 66%; background: var(--color-warning, #f76707); }
      .password-strength-fill.strong { width: 100%; background: var(--color-success, #1cb841); }

      .password-strength-label {
        font-size: 12px;
        margin-top: var(--spacing-xs, 4px);
      }

      .password-strength-label.weak { color: var(--color-error, #c83c3c); }
      .password-strength-label.medium { color: var(--color-warning, #f76707); }
      .password-strength-label.strong { color: var(--color-success, #1cb841); }
    `
  ];

  constructor() {
    super();
    this.errors = {};
    this.touched = {};
  }

  _handleInput(field, value) {
    this.dispatchEvent(new CustomEvent('state-update', {
      bubbles: true,
      composed: true,
      detail: { admin: { ...this.state.admin, [field]: value } }
    }));
    this._validateField(field, value);
  }

  _handleBlur(field) {
    this.touched = { ...this.touched, [field]: true };
    this._validateField(field, this.state.admin[field]);
  }

  _validateField(field, value) {
    const errors = { ...this.errors };
    const rules = {
      username: () => (!value || value.length < 3) ? 'Username must be at least 3 characters' : null,
      password: () => {
        if (!value || value.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
        if (!/[0-9]/.test(value)) return 'Password must contain at least one number';
        return null;
      },
      email: () => (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ? 'Please enter a valid email address' : null
    };

    const error = rules[field]?.();
    if (error) errors[field] = error;
    else delete errors[field];
    this.errors = errors;
  }

  _getPasswordStrength(password) {
    if (!password) return { level: 'weak', label: 'Weak' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { level: 'weak', label: 'Weak' };
    if (score <= 3) return { level: 'medium', label: 'Medium' };
    return { level: 'strong', label: 'Strong' };
  }

  _canProceed() {
    const a = this.state?.admin || {};
    return a.username?.length >= 3 &&
           a.password?.length >= 8 &&
           /[A-Z]/.test(a.password) && /[a-z]/.test(a.password) && /[0-9]/.test(a.password) &&
           /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email);
  }

  _renderField(id, label, type, value, helpText, autocomplete) {
    const hasError = this.touched[id] && this.errors[id];
    return html`
      <div class="form-group">
        <label for=${id}>${label}</label>
        <input
          type=${type}
          id=${id}
          class=${hasError ? 'error' : ''}
          aria-invalid=${hasError ? 'true' : 'false'}
          .value=${value || ''}
          @input=${(e) => this._handleInput(id, e.target.value)}
          @blur=${() => this._handleBlur(id)}
          autocomplete=${autocomplete}
        >
        ${hasError ? html`<div class="error-text" role="alert">${this.errors[id]}</div>`
                   : html`<div class="help-text">${helpText}</div>`}
      </div>
    `;
  }

  render() {
    const admin = this.state?.admin || {};
    const strength = this._getPasswordStrength(admin.password);

    return html`
      <h2>Admin Account</h2>
      <p>Create the administrator account for your TYPO3 installation.</p>

      ${this._renderField('username', 'Username', 'text', admin.username, 'Minimum 3 characters', 'username')}

      <div class="form-group">
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          class=${this.touched.password && this.errors.password ? 'error' : ''}
          .value=${admin.password || ''}
          @input=${(e) => this._handleInput('password', e.target.value)}
          @blur=${() => this._handleBlur('password')}
          autocomplete="new-password"
        >
        ${admin.password ? html`
          <div class="password-strength" aria-live="polite">
            <div class="password-strength-bar">
              <div class="password-strength-fill ${strength.level}"></div>
            </div>
            <div class="password-strength-label ${strength.level}">
              Password strength: ${strength.label}
            </div>
          </div>
        ` : ''}
        ${this.touched.password && this.errors.password
          ? html`<div class="error-text" role="alert">${this.errors.password}</div>`
          : html`<div class="help-text">Minimum 8 characters with uppercase, lowercase, and number</div>`}
      </div>

      ${this._renderField('email', 'Email', 'email', admin.email, 'Used for password recovery and notifications', 'email')}

      <t3-step-actions ?can-continue=${this._canProceed()}></t3-step-actions>
    `;
  }
}

customElements.define('step-admin', StepAdmin);
