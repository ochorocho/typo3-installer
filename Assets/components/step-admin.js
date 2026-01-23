import { LitElement, html, css } from 'lit';

export class StepAdmin extends LitElement {
  static properties = {
    state: { type: Object },
    errors: { type: Object },
    touched: { type: Object }
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
      padding: 6px 8px;
      border: 1px solid var(--color-border, #bbb);
      border-radius: var(--border-radius, 4px);
      font-size: 14px;
      background: var(--color-bg-white, #fff);
    }

    input:focus {
      outline: none;
      border-color: var(--color-primary, #ff8700);
      box-shadow: 0 0 0 3px rgba(255, 135, 0, 0.15);
    }

    input:focus-visible {
      outline: 2px solid var(--color-primary, #ff8700);
      outline-offset: 2px;
    }

    input.error {
      border-color: var(--color-error, #c83c3c);
    }

    input[aria-invalid="true"] {
      border-color: var(--color-error, #c83c3c);
    }

    .help-text {
      font-size: 12px;
      color: var(--color-text-light, #333);
      margin-top: var(--spacing-xs, 4px);
    }

    .error-text {
      font-size: 12px;
      color: var(--color-error, #c83c3c);
      margin-top: var(--spacing-xs, 4px);
    }

    .password-strength {
      margin-top: var(--spacing-sm, 8px);
    }

    .password-strength-bar {
      height: 4px;
      background: var(--color-border, #ddd);
      border-radius: 2px;
      overflow: hidden;
    }

    .password-strength-fill {
      height: 100%;
    }

    .password-strength-fill.weak {
      width: 33%;
      background: var(--color-error, #c83c3c);
    }

    .password-strength-fill.medium {
      width: 66%;
      background: var(--color-warning, #f76707);
    }

    .password-strength-fill.strong {
      width: 100%;
      background: var(--color-success, #1cb841);
    }

    .password-strength-label {
      font-size: 12px;
      margin-top: var(--spacing-xs, 4px);
    }

    .password-strength-label.weak {
      color: var(--color-error, #c83c3c);
    }

    .password-strength-label.medium {
      color: var(--color-warning, #f76707);
    }

    .password-strength-label.strong {
      color: var(--color-success, #1cb841);
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

    .btn-outline {
      background: transparent;
      border: 1px solid var(--color-border, #ddd);
      color: var(--color-text, #333);
    }

    .btn-outline:hover:not(:disabled) {
      background: var(--color-bg, #f5f5f5);
    }
  `;

  constructor() {
    super();
    this.errors = {};
    this.touched = {};
  }

  _handleInput(field, value) {
    const admin = { ...this.state.admin, [field]: value };
    this.dispatchEvent(new CustomEvent('state-update', {
      bubbles: true,
      composed: true,
      detail: { admin }
    }));
    this._validateField(field, value);
  }

  _handleBlur(field) {
    this.touched = { ...this.touched, [field]: true };
    this._validateField(field, this.state.admin[field]);
  }

  _validateField(field, value) {
    const errors = { ...this.errors };

    switch (field) {
      case 'username':
        if (!value || value.length < 3) {
          errors.username = 'Username must be at least 3 characters';
        } else {
          delete errors.username;
        }
        break;
      case 'password':
        if (!value || value.length < 8) {
          errors.password = 'Password must be at least 8 characters';
        } else if (!/[A-Z]/.test(value)) {
          errors.password = 'Password must contain at least one uppercase letter';
        } else if (!/[a-z]/.test(value)) {
          errors.password = 'Password must contain at least one lowercase letter';
        } else if (!/[0-9]/.test(value)) {
          errors.password = 'Password must contain at least one number';
        } else {
          delete errors.password;
        }
        break;
      case 'email':
        if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = 'Please enter a valid email address';
        } else {
          delete errors.email;
        }
        break;
    }

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

  _validateAll() {
    const admin = this.state.admin;
    this._validateField('username', admin.username);
    this._validateField('password', admin.password);
    this._validateField('email', admin.email);
    this.touched = { username: true, password: true, email: true };
  }

  _canProceed() {
    const admin = this.state?.admin || {};
    return admin.username?.length >= 3 &&
           admin.password?.length >= 8 &&
           /[A-Z]/.test(admin.password) &&
           /[a-z]/.test(admin.password) &&
           /[0-9]/.test(admin.password) &&
           /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email);
  }

  _handlePrevious() {
    this.dispatchEvent(new CustomEvent('previous-step', { bubbles: true, composed: true }));
  }

  _handleNext() {
    this._validateAll();
    if (this._canProceed()) {
      this.dispatchEvent(new CustomEvent('next-step', { bubbles: true, composed: true }));
    }
  }

  render() {
    const admin = this.state?.admin || {};
    const passwordStrength = this._getPasswordStrength(admin.password);

    return html`
      <h2>Admin Account</h2>
      <p>Create the administrator account for your TYPO3 installation.</p>

      <div class="form-group">
        <label for="username">Username</label>
        <input
          type="text"
          id="username"
          class="${this.touched.username && this.errors.username ? 'error' : ''}"
          aria-invalid="${this.touched.username && this.errors.username ? 'true' : 'false'}"
          aria-describedby="${this.errors.username ? 'error-username' : 'help-username'}"
          .value=${admin.username || ''}
          @input=${(e) => this._handleInput('username', e.target.value)}
          @blur=${() => this._handleBlur('username')}
          placeholder="admin"
          autocomplete="username"
        >
        ${this.touched.username && this.errors.username ? html`
          <div id="error-username" class="error-text" role="alert">${this.errors.username}</div>
        ` : html`
          <div id="help-username" class="help-text">Minimum 3 characters</div>
        `}
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          class="${this.touched.password && this.errors.password ? 'error' : ''}"
          aria-invalid="${this.touched.password && this.errors.password ? 'true' : 'false'}"
          aria-describedby="${this.errors.password ? 'error-password' : 'help-password'}"
          .value=${admin.password || ''}
          @input=${(e) => this._handleInput('password', e.target.value)}
          @blur=${() => this._handleBlur('password')}
          autocomplete="new-password"
        >
        ${admin.password ? html`
          <div class="password-strength" aria-live="polite">
            <div class="password-strength-bar" role="meter" aria-valuenow="${passwordStrength.level === 'weak' ? '33' : passwordStrength.level === 'medium' ? '66' : '100'}" aria-valuemin="0" aria-valuemax="100" aria-label="Password strength">
              <div class="password-strength-fill ${passwordStrength.level}"></div>
            </div>
            <div class="password-strength-label ${passwordStrength.level}">
              Password strength: ${passwordStrength.label}
            </div>
          </div>
        ` : ''}
        ${this.touched.password && this.errors.password ? html`
          <div id="error-password" class="error-text" role="alert">${this.errors.password}</div>
        ` : html`
          <div id="help-password" class="help-text">Minimum 8 characters with uppercase, lowercase, and number</div>
        `}
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input
          type="email"
          id="email"
          class="${this.touched.email && this.errors.email ? 'error' : ''}"
          aria-invalid="${this.touched.email && this.errors.email ? 'true' : 'false'}"
          aria-describedby="${this.errors.email ? 'error-email' : 'help-email'}"
          .value=${admin.email || ''}
          @input=${(e) => this._handleInput('email', e.target.value)}
          @blur=${() => this._handleBlur('email')}
          placeholder="admin@example.com"
          autocomplete="email"
        >
        ${this.touched.email && this.errors.email ? html`
          <div id="error-email" class="error-text" role="alert">${this.errors.email}</div>
        ` : html`
          <div id="help-email" class="help-text">Used for password recovery and notifications</div>
        `}
      </div>

      <div class="actions">
        <button class="btn-outline" @click=${this._handlePrevious}>Back</button>
        <button class="btn-primary" @click=${this._handleNext} ?disabled=${!this._canProceed()}>
          Continue
        </button>
      </div>
    `;
  }
}

customElements.define('step-admin', StepAdmin);
