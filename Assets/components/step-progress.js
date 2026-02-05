import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';
import { stepBaseStyles, buttonStyles, emit } from './ui/shared-styles.js';
import { validateInstallationConfig, getIncompleteStepDetails } from '../utils/step-validators.js';
import './ui/error-help.js';
import './ui/terminal-output.js';
import './ui/task-list.js';

/**
 * Installation progress step with streaming output.
 * @element step-progress
 */
export class StepProgress extends LitElement {
  static properties = {
    state: { type: Object },
    tasks: { type: Array },
    canRetry: { type: Boolean },
    outputLines: { type: Array },
    currentStep: { type: String },
    autoScroll: { type: Boolean }
  };

  static styles = [
    stepBaseStyles,
    buttonStyles,
    css`
      .progress-container { margin-bottom: var(--spacing-md, 16px); }

      .progress-bar {
        height: 8px;
        background: var(--color-border, #bbb);
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: var(--spacing-sm, 8px);
      }

      .progress-fill {
        height: 100%;
        background: var(--color-primary, #ff8700);
        border-radius: 4px;
      }

      .progress-text {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: var(--color-text-light, #333);
      }

      .success-message h3 {
        color: var(--color-success-heading, #137526);
        margin: 0 0 var(--spacing-md, 16px) 0;
        font-size: 1.5rem;
      }

      .success-message p { margin: 0 0 var(--spacing-md, 16px) 0; color: var(--color-text, #333); }
      .success-message .admin-info { font-size: 14px; margin-bottom: var(--spacing-lg, 24px); }

      .success-buttons {
        display: flex;
        gap: var(--spacing-md, 16px);
        justify-content: center;
        flex-wrap: wrap;
      }

      .error-message {
        padding: var(--spacing-lg, 24px);
        background: var(--color-error-bg, #ffebee);
        border: 1px solid var(--color-error, #c83c3c);
        border-radius: var(--border-radius, 4px);
        margin-bottom: var(--spacing-lg, 24px);
      }

      .error-message h3 {
        color: var(--color-error, #c83c3c);
        margin: 0 0 var(--spacing-md, 16px) 0;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
      }

      .error-message h3::before { content: '\u26A0'; font-size: 1.25rem; }
      .error-message .error-description { margin-bottom: var(--spacing-md, 16px); color: var(--color-text, #333); }

      .error-message .error-details {
        background: var(--color-bg-white, #fff);
        padding: var(--spacing-md, 16px);
        border-radius: var(--border-radius, 4px);
        font-size: 12px;
        font-family: monospace;
        color: var(--color-text, #333);
        margin-bottom: var(--spacing-md, 16px);
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .error-message .error-actions {
        display: flex;
        gap: var(--spacing-md, 16px);
        flex-wrap: wrap;
      }
    `
  ];

  constructor() {
    super();
    this.tasks = [
      { id: 'prepare', label: 'Preparing installation directory', status: 'pending' },
      { id: 'init', label: 'Initializing Composer project', status: 'pending' },
      { id: 'composer', label: 'Installing TYPO3 packages', status: 'pending' },
      { id: 'setup', label: 'Setting up TYPO3', status: 'pending' },
      { id: 'cache', label: 'Clearing caches', status: 'pending' },
      { id: 'finalize', label: 'Finalizing installation', status: 'pending' }
    ];
    this._streamController = null;
    this.canRetry = false;
    this.outputLines = [];
    this.currentStep = 'prepare';
    this.autoScroll = true;
  }

  connectedCallback() {
    super.connectedCallback();
    const install = this.state?.installation;
    if (!install?.running && !install?.completed && !install?.error) {
      this._startInstallation();
    } else if (install?.running) {
      this._startInstallation();
    } else if (install?.error) {
      this.canRetry = true;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._closeStream();
  }

  _closeStream() {
    if (this._streamController) {
      this._streamController.close();
      this._streamController = null;
    }
  }

  /**
   * Validates that all required configuration fields are present.
   * State is stored in sessionStorage and cleared on completion or when the window closes.
   * @returns {{ valid: boolean, missingFields: string[] }}
   */
  _validateConfig() {
    return validateInstallationConfig(this.state);
  }

  async _startInstallation() {
    // Validate configuration before starting
    const validation = this._validateConfig();
    if (!validation.valid) {
      const missingList = validation.missingFields.join(', ');
      this._updateInstallState({
        running: false,
        error: {
          message: `Missing required fields: ${missingList}. Please go back and complete all fields. Note: Passwords are not saved after page reload for security reasons.`,
          details: null,
          isValidationError: true
        }
      });
      this.canRetry = false;
      return;
    }

    this.canRetry = false;
    this.outputLines = [];
    this.currentStep = 'prepare';
    this.tasks = this.tasks.map(t => ({ ...t, status: 'pending' }));

    this._updateInstallState({ running: true, progress: 0, currentTask: 'Starting installation...', completed: false, error: null });
    this._addOutputLine('Starting TYPO3 installation...', 'info');

    const config = this._buildConfig();
    this._closeStream();

    this._streamController = apiClient.installWithStreaming(config, {
      onStart: (data) => this._addOutputLine(`[START] ${data.message}`, 'info'),
      onStep: (data) => {
        this.currentStep = data.step;
        this._updateTaskStatus(data.step, 'running');
        this._addStepMarker(this._getStepLabel(data.step));
      },
      onProgress: (data) => {
        this._updateInstallState({ running: true, progress: data.progress, currentTask: data.task, completed: false, error: null });
        this._updateTasksFromProgress(data.progress);
      },
      onOutput: (data) => this._addOutputLine(data.line),
      onComplete: (data) => {
        this._addOutputLine(`[COMPLETE] ${data.message}`, 'success');
        this._updateTaskStatus('finalize', 'completed');
        this._updateInstallState({ running: false, progress: 100, currentTask: 'Installation complete', completed: true, error: null, backendUrl: data.backendUrl });
        // Explicitly clear session storage on successful completion
        try { sessionStorage.removeItem('typo3-installer-state'); } catch { /* ignore */ }
      },
      onError: (error) => {
        this._addOutputLine(`[ERROR] ${error.message}`, 'error');
        this.canRetry = true;
        this._updateInstallState({ running: false, error: { message: error.message, details: error.details?.details || null, isNetworkError: error.isNetworkError || false } });
      }
    });
  }

  _buildConfig() {
    return {
      packages: this.state.packages.selected,
      typo3Version: this.state.typo3Version || '13.4',
      database: {
        driver: this.state.database.driver,
        host: this.state.database.host,
        port: parseInt(this.state.database.port, 10),
        name: this.state.database.name,
        user: this.state.database.user,
        password: this.state.database.password
      },
      admin: { username: this.state.admin.username, password: this.state.admin.password, email: this.state.admin.email },
      site: { name: this.state.site.name, baseUrl: this.state.site.baseUrl },
      phpBinary: this.state.phpDetection?.selectedBinary || null
    };
  }

  _updateInstallState(installData) {
    emit(this, 'state-update', { installation: { ...this.state.installation, ...installData } });
    this.requestUpdate();
  }

  _addOutputLine(text, type = null) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.outputLines = [...this.outputLines, { text, type, timestamp, step: this.currentStep }];
    this.requestUpdate();
  }

  _addStepMarker(label) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    this.outputLines = [...this.outputLines, { text: `=== ${label} ===`, type: 'step-marker', timestamp, step: this.currentStep, isStepMarker: true }];
    this.requestUpdate();
  }

  _getStepLabel(step) {
    const labels = { prepare: 'Preparing Installation', init: 'Initializing Composer Project', composer: 'Installing TYPO3 Packages', setup: 'Setting Up TYPO3', cache: 'Clearing Caches', finalize: 'Finalizing Installation' };
    return labels[step] || step;
  }

  _updateTaskStatus(taskId, status) {
    this.tasks = this.tasks.map(t => t.id === taskId ? { ...t, status } : t);
  }

  _updateTasksFromProgress(progress) {
    const thresholds = [
      { id: 'prepare', min: 0, max: 15 }, { id: 'init', min: 15, max: 20 },
      { id: 'composer', min: 20, max: 50 }, { id: 'setup', min: 50, max: 95 },
      { id: 'cache', min: 95, max: 98 }, { id: 'finalize', min: 98, max: 100 }
    ];
    this.tasks = this.tasks.map(task => {
      const t = thresholds.find(th => th.id === task.id);
      if (!t) return task;
      const status = progress >= t.max ? 'completed' : progress >= t.min ? 'running' : 'pending';
      return { ...task, status };
    });
  }

  _handleRetry() { this._startInstallation(); }
  _handleGoBack() { emit(this, 'previous-step'); }
  _handleToggleAutoScroll() { this.autoScroll = !this.autoScroll; }
  _handleClearOutput() { this.outputLines = []; }

  render() {
    const install = this.state?.installation || {};

    if (install.error) {
      const isValidationError = install.error.isValidationError;
      const incompleteSteps = isValidationError ? getIncompleteStepDetails(this.state) : [];
      return html`
        <div class="error-message" role="alert">
          <h3>${isValidationError ? 'Missing Configuration' : 'Installation Failed'}</h3>
          <p class="error-description">${install.error.message || 'An unexpected error occurred.'}</p>
          ${install.error.details ? html`<details><summary>Technical details</summary><div class="error-details">${install.error.details}</div></details>` : ''}
          ${isValidationError && incompleteSteps.length > 0 ? html`
            <p>The following steps need attention:</p>
            <div class="error-actions">
              ${incompleteSteps.map(step => html`
                <button class="btn-primary" @click=${() => emit(this, 'navigate-to-step', { stepId: step.id })}>${step.name}</button>
              `)}
            </div>
          ` : html`
            <div class="error-actions">
              ${isValidationError ? '' : html`<button class="btn-primary" @click=${this._handleRetry}>Retry Installation</button>`}
              <button class="${isValidationError ? 'btn-primary' : 'btn-outline'}" @click=${this._handleGoBack}>Go Back to Configuration</button>
            </div>
          `}
          ${isValidationError ? '' : html`<t3-error-help .error=${install.error} context="installation"></t3-error-help>`}
        </div>
        ${this.outputLines.length > 0 ? html`
          <t3-terminal-output .lines=${this.outputLines} .autoScroll=${this.autoScroll}
            @toggle-autoscroll=${this._handleToggleAutoScroll} @clear-output=${this._handleClearOutput}></t3-terminal-output>
        ` : ''}
      `;
    }

    const progress = install.progress || 0;
    return html`
      <h2>${install.completed ? 'TYPO3 Installed' : 'Installing TYPO3'}</h2>
      ${install.completed ? '' : html`<p>Please wait while TYPO3 is being installed. You can follow the progress below.</p>`}

      <div class="progress-container">
        <div class="progress-bar" role="progressbar" aria-label="Installation progress" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">
          <span>${install.currentTask || 'Starting...'}</span>
          <span>${progress}%</span>
        </div>
      </div>

      <t3-task-list .tasks=${this.tasks}></t3-task-list>

      ${install.completed ? html`
        <div class="success-message">
          <h3>Installation Complete!</h3>
          <div class="success-buttons">
            <a href="${install.backendUrl || '/typo3'}" class="btn-success" target="_blank">Go to TYPO3 Backend</a>
            <a href="${this.state.site?.baseUrl || '/'}" class="btn-outline" target="_blank">Go to Frontend</a>
          </div>
        </div>
      ` : ''}

      <t3-terminal-output .lines=${this.outputLines} .autoScroll=${this.autoScroll}
        @toggle-autoscroll=${this._handleToggleAutoScroll} @clear-output=${this._handleClearOutput}></t3-terminal-output>
    `;
  }
}

customElements.define('step-progress', StepProgress);
