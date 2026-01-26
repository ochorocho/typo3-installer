import { LitElement, html, css } from 'lit';
import { stepBaseStyles, formStyles, emit } from './ui/shared-styles.js';
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
      .password-strength-label { font-size: 12px; margin-top: var(--spacing-xs, 4px); }
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
      username: v => (!v || v.length < 3) ? 'Username must be at least 3 characters' : null,
      password: v => {
        if (!v || v.length < 8) return 'Password must be at least 8 characters';
        if (!/[A-Z]/.test(v)) return 'Password must contain at least one uppercase letter';
        if (!/[a-z]/.test(v)) return 'Password must contain at least one lowercase letter';
        if (!/[0-9]/.test(v)) return 'Password must contain at least one number';
        return null;
      },
      email: v => (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) ? 'Please enter a valid email address' : null
    };
    const error = validators[field]?.(value);
    this.errors = error ? { ...this.errors, [field]: error } : (delete this.errors[field], { ...this.errors });
  }

  _getStrength(p) {
    if (!p) return { level: 'weak', label: 'Weak' };
    let score = (p.length >= 8) + (p.length >= 12) + (/[A-Z]/.test(p) && /[a-z]/.test(p)) + /[0-9]/.test(p) + /[^A-Za-z0-9]/.test(p);
    return score <= 2 ? { level: 'weak', label: 'Weak' } : score <= 3 ? { level: 'medium', label: 'Medium' } : { level: 'strong', label: 'Strong' };
  }

  _canProceed() {
    const a = this.state?.admin || {};
    return a.username?.length >= 3 && a.password?.length >= 8 &&
           /[A-Z]/.test(a.password) && /[a-z]/.test(a.password) && /[0-9]/.test(a.password) &&
           /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email);
  }

  _field(id, label, type, value, helpText, autocomplete, required = false) {
    const hasError = this.touched[id] && this.errors[id];
    return html`
      <div class="form-group">
        <label for=${id} class=${required ? 'required' : ''}>${label}</label>
        <input type=${type} id=${id} class=${hasError ? 'error' : ''} aria-invalid=${hasError ? 'true' : 'false'}
          ?required=${required} .value=${value || ''} @input=${e => this._update(id, e.target.value)} @blur=${() => this._blur(id)} autocomplete=${autocomplete}>
        ${hasError ? html`<div class="error-text" role="alert">${this.errors[id]}</div>` : html`<div class="help-text">${helpText}</div>`}
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
          required .value=${admin.password || ''} @input=${e => this._update('password', e.target.value)}
          @blur=${() => this._blur('password')} autocomplete="new-password">
        ${admin.password ? html`
          <div class="password-strength" aria-live="polite">
            <div class="password-strength-bar"><div class="password-strength-fill ${strength.level}"></div></div>
            <div class="password-strength-label ${strength.level}">Password strength: ${strength.label}</div>
          </div>
        ` : ''}
        ${this.touched.password && this.errors.password
          ? html`<div class="error-text" role="alert">${this.errors.password}</div>`
          : html`<div class="help-text">Minimum 8 characters with uppercase, lowercase, and number</div>`}
      </div>

      ${this._field('email', 'Email', 'email', admin.email, 'Used for password recovery and notifications', 'email', true)}

      <t3-step-actions ?can-continue=${this._canProceed()}></t3-step-actions>
    `;
  }
}

customElements.define('step-admin', StepAdmin);
