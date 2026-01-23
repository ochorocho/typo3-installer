import { LitElement, html, css } from 'lit';
import { ContextProvider } from '@lit/context';
import { installerContext, initialState, STEPS } from '../context/installer-context.js';

export class InstallerApp extends LitElement {
  static properties = {
    state: { type: Object }
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

    .header {
      text-align: center;
      padding: var(--spacing-xl, 32px) 0;
      background: var(--color-primary, #ff8700);
      color: white;
      border-radius: var(--border-radius-lg, 8px) var(--border-radius-lg, 8px) 0 0;
      margin-bottom: 0;
    }

    .header h1 {
      margin: 0 0 var(--spacing-sm, 8px) 0;
      font-size: 2rem;
      font-weight: 600;
    }

    .header p {
      margin: 0;
      opacity: 0.9;
    }

    .progress-bar {
      display: flex;
      justify-content: space-between;
      padding: var(--spacing-lg, 24px);
      background: white;
      border-bottom: 1px solid var(--color-border, #ddd);
      position: relative;
    }

    .progress-bar::before {
      content: '';
      position: absolute;
      top: 50%;
      left: var(--spacing-lg, 24px);
      right: var(--spacing-lg, 24px);
      height: 2px;
      background: var(--color-border, #ddd);
      transform: translateY(-50%);
      z-index: 0;
    }

    .step-indicator {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 1;
      background: white;
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
      background: white;
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
      color: var(--color-text-light, #666);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .step-indicator.active .step-title {
      color: var(--color-primary, #ff8700);
      font-weight: 600;
    }

    .content {
      background: white;
      padding: var(--spacing-xl, 32px);
      border-radius: 0 0 var(--border-radius-lg, 8px) var(--border-radius-lg, 8px);
      box-shadow: var(--shadow, 0 2px 8px rgba(0,0,0,0.1));
    }
  `;

  constructor() {
    super();
    this.state = { ...initialState };
    new ContextProvider(this, { context: installerContext, initialValue: this.state });
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('state-update', this._handleStateUpdate);
    this.addEventListener('next-step', this._handleNextStep);
    this.addEventListener('previous-step', this._handlePreviousStep);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('state-update', this._handleStateUpdate);
    this.removeEventListener('next-step', this._handleNextStep);
    this.removeEventListener('previous-step', this._handlePreviousStep);
  }

  _handleStateUpdate = (e) => {
    this.state = { ...this.state, ...e.detail };
    this.requestUpdate();
  };

  _handleNextStep = () => {
    if (this.state.currentStep < STEPS.length - 1) {
      this.state = { ...this.state, currentStep: this.state.currentStep + 1 };
      this.requestUpdate();
    }
  };

  _handlePreviousStep = () => {
    if (this.state.currentStep > 0) {
      this.state = { ...this.state, currentStep: this.state.currentStep - 1 };
      this.requestUpdate();
    }
  };

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
        <div class="header">
          <h1>TYPO3 Installer</h1>
          <p>Install TYPO3 CMS on your server</p>
        </div>

        <div class="progress-bar">
          ${STEPS.map((step, index) => html`
            <div class="step-indicator ${index === this.state.currentStep ? 'active' : ''} ${index < this.state.currentStep ? 'completed' : ''}">
              <div class="step-number">${index < this.state.currentStep ? '' : index + 1}</div>
              <div class="step-title">${step.title}</div>
            </div>
          `)}
        </div>

        <div class="content">
          ${this._renderStepContent()}
        </div>
      </div>
    `;
  }
}

customElements.define('installer-app', InstallerApp);
