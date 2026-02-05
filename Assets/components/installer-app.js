import { LitElement, html, css } from 'lit';
import { ContextProvider } from '@lit/context';
import { installerContext, initialState, STEPS } from '../context/installer-context.js';
import { isStepComplete, canStartInstallation } from '../utils/index.js';
import './ui/theme-toggle.js';
import './ui/t3-icon.js'

const STORAGE_KEY = 'typo3-installer-state';

export class InstallerApp extends LitElement {
  static properties = {
    state: { type: Object },
    invalidSteps: { type: Array }
  };

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: var(--color-bg, #f5f5f5);
    }

    .installer {
      max-width: 800px;
      margin: 0 auto;
      padding: var(--spacing-lg, 24px);
    }

    .shadow-radius {
      border-radius: var(--border-radius-lg, 8px);
      box-shadow: var(--shadow, 0 0 8px rgba(0,0,0,0.1));
      background: var(--color-bg-white, white);
    }

    .header {
      position: relative;
      padding: var(--spacing-xl, 32px);
      //border-radius: var(--border-radius-lg, 8px) var(--border-radius-lg, 8px) 0 0
    }

    [identifier="typo3-logo"] {
      width: 20%;
      max-width: 200px;
    }

    .header h1 {
      margin: 0 0 var(--spacing-sm, 8px) 0;
      font-size: 2rem;
      font-weight: 600;
    }

    .header p {
      margin: 0;
    }

    .header-controls {
      position: absolute;
      top: var(--spacing-sm, 8px);
      right: var(--spacing-md, 16px);
    }

    .progress-bar {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-lg, 24px);
      background: var(--color-bg-white, white);
      border-top: 1px solid var(--color-border, #bbbbbb);
      border-bottom: 1px solid var(--color-border, #bbbbbb);
      position: relative;
    }

    .progress-bar::before {
      content: '';
      position: absolute;
      top: 50%;
      left: var(--spacing-lg, 24px);
      right: var(--spacing-lg, 24px);
      height: 2px;
      background: var(--color-border, #bbbbbb);
      transform: translateY(-50%);
      z-index: 0;
    }

    .step-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 1;
      background: var(--color-bg-white, white);
      padding: 0 var(--spacing-sm, 8px);
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      border: 2px solid var(--color-border, #bbb);
      background: var(--color-bg-white, white);
      color: var(--color-text-light, #333);
    }

    .step-indicator.active .step-number {
      border-color: var(--color-primary, #ff8700);
      background: var(--color-primary, #ff8700);
      color: white;
    }

    .step-indicator.completed .step-number {
      border-color: var(--color-success, #4caf50);
      background: var(--color-success, #4caf50);
      color: white;
    }

    .step-indicator.completed .step-number::after {
      content: '\\2713';
    }

    .step-title {
      margin-top: var(--spacing-xs, 4px);
      font-size: 12px;
      color: var(--color-text-light, #333333);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .step-indicator.active .step-title {
      color: var(--color-primary, #ff8700);
      font-weight: 600;
    }

    .step-indicator {
      cursor: pointer;
    }

    .step-indicator:hover {
      transform: scale(1.05);
    }

    .step-indicator.completed:hover .step-number {
      box-shadow: 0 2px 8px rgba(76, 175, 80, 0.4);
    }

    .step-indicator:not(.completed):not(.active):hover .step-number {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .step-indicator.incomplete .step-number {
      border-color: var(--color-warning, #f76707);
    }

    .step-indicator.incomplete .step-title {
      color: var(--color-warning, #f76707);
    }

    .step-indicator.has-error .step-number {
      border-color: var(--color-error, #c83c3c);
      background: var(--color-error-bg, #ffebee);
      color: var(--color-error, #c83c3c);
    }

    .step-indicator.has-error .step-title {
      color: var(--color-error, #c83c3c);
      font-weight: 600;
    }

    .step-indicator.shake {
      animation: shake 0.6s ease-in-out;
    }

    .step-indicator.shake .step-number {
      border-color: var(--color-error, #c83c3c);
      box-shadow: 0 0 0 3px rgba(200, 60, 60, 0.3);
    }

    .step-indicator.shake .step-title {
      color: var(--color-error, #c83c3c);
      font-weight: 600;
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
      20%, 40%, 60%, 80% { transform: translateX(4px); }
    }

    .progress-bar.nav-disabled .step-indicator {
      cursor: default;
    }

    .progress-bar.nav-disabled .step-indicator:hover {
      transform: none;
    }

    .progress-bar.nav-disabled .step-indicator:hover .step-number {
      box-shadow: none;
    }

    .content {
      background: var(--color-bg-white, white);
      padding: var(--spacing-xl, 32px);
      border-radius: 0 0 var(--border-radius-lg, 8px) var(--border-radius-lg, 8px);
    }
  `;

  constructor() {
    super();
    this.state = this._loadState();
    this.invalidSteps = [];
    new ContextProvider(this, { context: installerContext, initialValue: this.state });
  }

  _loadState() {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Don't restore if installation was completed
        if (parsed.installation?.completed) {
          sessionStorage.removeItem(STORAGE_KEY);
          return { ...initialState };
        }
        return { ...initialState, ...parsed };
      }
    } catch {
      // Ignore storage errors
    }
    return { ...initialState };
  }

  _saveState(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }

  _clearState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('state-update', this._handleStateUpdate);
    this.addEventListener('next-step', this._handleNextStep);
    this.addEventListener('previous-step', this._handlePreviousStep);
    this.addEventListener('validation-failed', this._handleValidationFailed);
    this.addEventListener('navigate-to-step', this._handleNavigateToStep);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('state-update', this._handleStateUpdate);
    this.removeEventListener('next-step', this._handleNextStep);
    this.removeEventListener('previous-step', this._handlePreviousStep);
    this.removeEventListener('validation-failed', this._handleValidationFailed);
    this.removeEventListener('navigate-to-step', this._handleNavigateToStep);
  }

  _handleStateUpdate = (e) => {
    this.state = { ...this.state, ...e.detail };

    // Clear storage on installation completion, otherwise persist state
    if (this.state.installation?.completed) {
      this._clearState();
    } else {
      this._saveState(this.state);
    }

    // Clear error indicators for steps that are now complete
    if (this.invalidSteps.length > 0) {
      this.invalidSteps = this.invalidSteps.filter(i => !this._isStepComplete(i));
    }

    this.requestUpdate();
  };

  _handleNextStep = () => {
    const nextStep = this.state.currentStep + 1;
    if (nextStep < STEPS.length) {
      // Prevent advancing to install step if not all requirements are met
      if (nextStep === STEPS.length - 1 && !this._canStartInstallation()) {
        return;
      }
      this.state = { ...this.state, currentStep: nextStep };
      this.requestUpdate();
    }
  };

  _handlePreviousStep = () => {
    if (this.state.currentStep > 0) {
      this.state = { ...this.state, currentStep: this.state.currentStep - 1 };
      this.requestUpdate();
    }
  };

  _handleValidationFailed = () => {
    // Find all incomplete steps and animate them
    const incompleteIndices = [];
    for (let i = 0; i < STEPS.length - 1; i++) {
      if (!this._isStepComplete(i)) {
        incompleteIndices.push(i);
      }
    }

    if (incompleteIndices.length === 0) {
      this.invalidSteps = [];
      return;
    }

    // Set persistent error state on incomplete steps
    this.invalidSteps = [...incompleteIndices];

    // Get step indicators and add shake class
    const indicators = this.shadowRoot.querySelectorAll('.step-indicator');
    incompleteIndices.forEach(index => {
      const indicator = indicators[index];
      if (indicator) {
        indicator.classList.add('shake');
        // Remove the class after animation completes
        setTimeout(() => {
          indicator.classList.remove('shake');
        }, 600);
      }
    });
  };

  _handleNavigateToStep = (e) => {
    const stepId = e.detail.stepId;
    const index = STEPS.findIndex(s => s.id === stepId);
    if (index >= 0) {
      this.state = { ...this.state, currentStep: index };
      this.requestUpdate();
    }
  };

  _isOnProgressStep() {
    return this.state.currentStep === STEPS.length - 1;
  }

  _isStepComplete(index) {
    const step = STEPS[index];
    return isStepComplete(step.id, this.state);
  }

  _canStartInstallation() {
    return canStartInstallation(this.state);
  }

  _handleStepClick(index) {
    // Disable navigation when on the progress/install step
    if (this._isOnProgressStep()) {
      return;
    }
    // Prevent navigating to install step if not all steps are complete
    if (index === STEPS.length - 1 && !this._canStartInstallation()) {
      return;
    }
    // Allow navigation to any step
    if (index !== this.state.currentStep) {
      this.state = { ...this.state, currentStep: index };
      this.requestUpdate();
    }
  }

  _renderStepContent() {
    const step = STEPS[this.state.currentStep];
    switch (step.component) {
      case 'step-packages':
        return html`<step-packages .state=${this.state}></step-packages>`;
      case 'step-requirements':
        return html`<step-requirements .state=${this.state}></step-requirements>`;
      case 'step-database':
        return html`<step-database .state=${this.state}></step-database>`;
      case 'step-admin':
        return html`<step-admin .state=${this.state}></step-admin>`;
      case 'step-site':
        return html`<step-site .state=${this.state}></step-site>`;
      case 'step-progress':
        return html`<step-progress .state=${this.state}></step-progress>`;
      default:
        return html`<p>Unknown step</p>`;
    }
  }

  render() {
    return html`
      <div class="installer">
        <div class="shadow-radius">
          <div class="header">
            <div class="header-controls">
              <t3-theme-toggle></t3-theme-toggle>
            </div>
            <t3-icon identifier="typo3-logo" size="auto"></t3-icon>
          </div>

          <div class="progress-bar ${this._isOnProgressStep() ? 'nav-disabled' : ''}">
            ${STEPS.map((step, index) => {
              const isActive = index === this.state.currentStep;
              const isCompleted = this._isStepComplete(index);
              const isVisited = index < this.state.currentStep;
              const isIncomplete = isVisited && !isCompleted;
              const isInstallStep = index === STEPS.length - 1;
              const canNavigate = !this._isOnProgressStep() && (isInstallStep ? this._canStartInstallation() : true);

              const hasError = this.invalidSteps?.includes(index);

              return html`
                <div
                  class="step-indicator ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${isIncomplete ? 'incomplete' : ''} ${hasError ? 'has-error' : ''}"
                  @click=${() => this._handleStepClick(index)}
                  @keydown=${(e) => e.key === 'Enter' && this._handleStepClick(index)}
                  role="button"
                  tabindex="${canNavigate && !isActive ? '0' : '-1'}"
                  aria-label="${step.title}${isCompleted ? ' - completed' : isIncomplete ? ' - incomplete' : ''}"
                >
                  <div class="step-number">${isCompleted ? '' : index + 1}</div>
                  <div class="step-title">${step.title}</div>
                </div>
              `;
            })}
          </div>

          <div class="content">
            ${this._renderStepContent()}
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('installer-app', InstallerApp);
