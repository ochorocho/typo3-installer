import { LitElement, html } from 'lit';
import { ContextProvider } from '@lit/context';
import { installerContext, initialState, STEPS } from '../context/installer-context.js';
import { isStepComplete, canStartInstallation } from '../utils/index.js';
import './ui/theme-toggle.js';
import './ui/t3-icon.js'

const STORAGE_KEY = 'typo3-installer-state';

export class InstallerApp extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    state: { type: Object },
    invalidSteps: { type: Array }
  };

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

    // Get step indicators and add shake class (light DOM, use this directly)
    const indicators = this.querySelectorAll('.step-indicator');
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

          <div class="installer-progress-bar ${this._isOnProgressStep() ? 'nav-disabled' : ''}">
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
