import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';
import { stepBaseStyles, buttonStyles } from './ui/shared-styles.js';
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
        transition: width 0.3s ease;
      }

      .progress-text {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: var(--color-text-light, #333);
      }

      .success-message {
        text-align: center;
        padding: var(--spacing-xl, 32px);
        background: var(--color-success-bg, #e8f5e9);
        border-radius: var(--border-radius, 4px);
        margin-bottom: var(--spacing-lg, 24px);
      }

      .success-message h3 {
        color: var(--color-success, #1cb841);
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
        background: #fff;
        padding: var(--spacing-md, 16px);
        border-radius: var(--border-radius, 4px);
        font-size: 12px;
        font-family: monospace;
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

  async _startInstallation() {
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
    this.dispatchEvent(new CustomEvent('state-update', {
      bubbles: true,
      composed: true,
      detail: { installation: { ...this.state.installation, ...installData } }
    }));
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
  _handleGoBack() { this.dispatchEvent(new CustomEvent('previous-step', { bubbles: true, composed: true })); }
  _handleToggleAutoScroll() { this.autoScroll = !this.autoScroll; }
  _handleClearOutput() { this.outputLines = []; }

  render() {
    const install = this.state?.installation || {};

    if (install.completed) {
      return html`
        <div class="success-message">
          <h3>Installation Complete!</h3>
          <p>TYPO3 has been successfully installed on your server.</p>
          <div class="admin-info"><p>Admin username: <strong>${this.state.admin.username}</strong></p></div>
          <div class="success-buttons">
            <a href="${install.backendUrl || '/typo3'}" class="btn-success" target="_blank">Go to TYPO3 Backend</a>
            <a href="${this.state.site?.baseUrl || '/'}" class="btn-outline" target="_blank">Go to Frontend</a>
          </div>
        </div>
        <t3-terminal-output .lines=${this.outputLines} .autoScroll=${this.autoScroll}
          @toggle-autoscroll=${this._handleToggleAutoScroll} @clear-output=${this._handleClearOutput}></t3-terminal-output>
      `;
    }

    if (install.error) {
      return html`
        <div class="error-message" role="alert">
          <h3>Installation Failed</h3>
          <p class="error-description">${install.error.message || 'An unexpected error occurred.'}</p>
          ${install.error.details ? html`<details><summary>Technical details</summary><div class="error-details">${install.error.details}</div></details>` : ''}
          <div class="error-actions">
            <button class="btn-primary" @click=${this._handleRetry}>Retry Installation</button>
            <button class="btn-outline" @click=${this._handleGoBack}>Go Back to Configuration</button>
          </div>
          <t3-error-help .error=${install.error} context="installation"></t3-error-help>
        </div>
        <t3-terminal-output .lines=${this.outputLines} .autoScroll=${this.autoScroll}
          @toggle-autoscroll=${this._handleToggleAutoScroll} @clear-output=${this._handleClearOutput}></t3-terminal-output>
      `;
    }

    const progress = install.progress || 0;
    return html`
      <h2>Installing TYPO3</h2>
      <p>Please wait while TYPO3 is being installed. You can follow the progress below.</p>

      <div class="progress-container">
        <div class="progress-bar" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">
          <span>${install.currentTask || 'Starting...'}</span>
          <span>${progress}%</span>
        </div>
      </div>

      <t3-task-list .tasks=${this.tasks}></t3-task-list>

      <t3-terminal-output .lines=${this.outputLines} .autoScroll=${this.autoScroll}
        @toggle-autoscroll=${this._handleToggleAutoScroll} @clear-output=${this._handleClearOutput}></t3-terminal-output>
    `;
  }
}

customElements.define('step-progress', StepProgress);
