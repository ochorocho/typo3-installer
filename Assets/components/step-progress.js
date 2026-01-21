import { LitElement, html, css } from 'lit';
import { apiClient } from '../api/client.js';

export class StepProgress extends LitElement {
  static properties = {
    state: { type: Object },
    tasks: { type: Array }
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

    .progress-container {
      margin-bottom: var(--spacing-xl, 32px);
    }

    .progress-bar {
      height: 8px;
      background: var(--color-border, #ddd);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: var(--spacing-sm, 8px);
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--color-primary, #ff8700), #ff9800);
      border-radius: 4px;
      transition: width 0.5s ease;
      animation: shimmer 2s infinite linear;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .progress-text {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
      color: var(--color-text-light, #666);
    }

    .task-list {
      margin-bottom: var(--spacing-lg, 24px);
    }

    .task {
      display: flex;
      align-items: center;
      padding: var(--spacing-sm, 8px) 0;
      border-bottom: 1px solid var(--color-border, #ddd);
    }

    .task:last-child {
      border-bottom: none;
    }

    .task-icon {
      width: 24px;
      height: 24px;
      margin-right: var(--spacing-md, 16px);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .task.pending .task-icon {
      color: var(--color-text-light, #666);
    }

    .task.running .task-icon {
      color: var(--color-primary, #ff8700);
      animation: pulse 1s infinite;
    }

    .task.completed .task-icon {
      color: var(--color-success, #4caf50);
    }

    .task.error .task-icon {
      color: var(--color-error, #f44336);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .task-label {
      flex: 1;
    }

    .task.pending .task-label {
      color: var(--color-text-light, #666);
    }

    .task.running .task-label {
      color: var(--color-secondary, #1a1a1a);
      font-weight: 600;
    }

    .task.completed .task-label {
      color: var(--color-success, #4caf50);
    }

    .success-message {
      text-align: center;
      padding: var(--spacing-xl, 32px);
      background: #e8f5e9;
      border-radius: var(--border-radius, 4px);
      margin-bottom: var(--spacing-lg, 24px);
    }

    .success-message h3 {
      color: var(--color-success, #4caf50);
      margin: 0 0 var(--spacing-md, 16px) 0;
      font-size: 1.5rem;
    }

    .success-message p {
      margin: 0 0 var(--spacing-md, 16px) 0;
      color: var(--color-text, #333);
    }

    .success-message .admin-info {
      font-size: 14px;
      color: var(--color-text-light, #666);
      margin-bottom: var(--spacing-lg, 24px);
    }

    .error-message {
      padding: var(--spacing-lg, 24px);
      background: #ffebee;
      border: 1px solid var(--color-error, #f44336);
      border-radius: var(--border-radius, 4px);
      margin-bottom: var(--spacing-lg, 24px);
    }

    .error-message h3 {
      color: var(--color-error, #f44336);
      margin: 0 0 var(--spacing-sm, 8px) 0;
    }

    .error-message pre {
      background: #fff;
      padding: var(--spacing-md, 16px);
      border-radius: var(--border-radius, 4px);
      overflow-x: auto;
      font-size: 12px;
      margin: 0;
    }

    button {
      padding: var(--spacing-sm, 8px) var(--spacing-lg, 24px);
      border: none;
      border-radius: var(--border-radius, 4px);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-block;
    }

    .btn-success {
      background: var(--color-success, #4caf50);
      color: white;
    }

    .btn-success:hover {
      background: #43a047;
    }
  `;

  constructor() {
    super();
    this.tasks = [
      { id: 'init', label: 'Initializing Composer project', status: 'pending' },
      { id: 'composer', label: 'Installing TYPO3 packages', status: 'pending' },
      { id: 'database', label: 'Setting up database schema', status: 'pending' },
      { id: 'admin', label: 'Creating admin account', status: 'pending' },
      { id: 'site', label: 'Configuring site', status: 'pending' },
      { id: 'cache', label: 'Clearing caches', status: 'pending' },
      { id: 'finalize', label: 'Finalizing installation', status: 'pending' }
    ];
    this._pollInterval = null;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.state?.installation?.running && !this.state?.installation?.completed) {
      this._startInstallation();
    } else if (this.state?.installation?.running) {
      this._startPolling();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._stopPolling();
  }

  async _startInstallation() {
    this.dispatchEvent(new CustomEvent('state-update', {
      bubbles: true,
      composed: true,
      detail: {
        installation: {
          ...this.state.installation,
          running: true,
          progress: 0,
          currentTask: 'Starting installation...',
          completed: false,
          error: null
        }
      }
    }));

    try {
      const config = {
        packages: this.state.packages.selected,
        database: {
          driver: this.state.database.driver,
          host: this.state.database.host,
          port: parseInt(this.state.database.port, 10),
          name: this.state.database.name,
          user: this.state.database.user,
          password: this.state.database.password
        },
        admin: {
          username: this.state.admin.username,
          password: this.state.admin.password,
          email: this.state.admin.email
        },
        site: {
          name: this.state.site.name,
          baseUrl: this.state.site.baseUrl
        }
      };

      await apiClient.install(config);
      this._startPolling();
    } catch (error) {
      this.dispatchEvent(new CustomEvent('state-update', {
        bubbles: true,
        composed: true,
        detail: {
          installation: {
            ...this.state.installation,
            running: false,
            error: error.message
          }
        }
      }));
    }
  }

  _startPolling() {
    if (this._pollInterval) return;

    this._pollInterval = setInterval(async () => {
      try {
        const status = await apiClient.getStatus();

        this._updateTasks(status.progress, status.currentTask);

        this.dispatchEvent(new CustomEvent('state-update', {
          bubbles: true,
          composed: true,
          detail: {
            installation: {
              running: !status.completed && !status.error,
              progress: status.progress,
              currentTask: status.currentTask,
              completed: status.completed,
              error: status.error,
              backendUrl: status.backendUrl
            }
          }
        }));

        if (status.completed || status.error) {
          this._stopPolling();
        }
      } catch (error) {
        console.error('Failed to poll status:', error);
      }
    }, 1000);
  }

  _stopPolling() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  _updateTasks(progress, currentTask) {
    const progressThresholds = [
      { id: 'init', min: 10, max: 15 },
      { id: 'composer', min: 15, max: 50 },
      { id: 'database', min: 50, max: 70 },
      { id: 'admin', min: 70, max: 80 },
      { id: 'site', min: 80, max: 90 },
      { id: 'cache', min: 90, max: 98 },
      { id: 'finalize', min: 98, max: 100 }
    ];

    this.tasks = this.tasks.map(task => {
      const threshold = progressThresholds.find(t => t.id === task.id);
      if (!threshold) return task;

      let status = 'pending';
      if (progress >= threshold.max) {
        status = 'completed';
      } else if (progress >= threshold.min) {
        status = 'running';
      }

      return { ...task, status };
    });
  }

  _getTaskIcon(status) {
    switch (status) {
      case 'pending': return '\u25CB';
      case 'running': return '\u25CF';
      case 'completed': return '\u2713';
      case 'error': return '\u2717';
      default: return '\u25CB';
    }
  }

  render() {
    const installation = this.state?.installation || {};
    const progress = installation.progress || 0;

    if (installation.completed) {
      return html`
        <div class="success-message">
          <h3>Installation Complete!</h3>
          <p>TYPO3 has been successfully installed on your server.</p>
          <div class="admin-info">
            <p>Admin username: <strong>${this.state.admin.username}</strong></p>
          </div>
          <a href="${installation.backendUrl || '/typo3'}" class="btn-success" target="_blank">
            Go to TYPO3 Backend
          </a>
        </div>
      `;
    }

    if (installation.error) {
      return html`
        <div class="error-message">
          <h3>Installation Failed</h3>
          <pre>${installation.error.message}</pre>
          <pre>${installation.error.details}</pre>
        </div>
      `;
    }

    return html`
      <h2>Installing TYPO3</h2>
      <p>Please wait while TYPO3 is being installed. This may take a few minutes.</p>

      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="progress-text">
          <span>${installation.currentTask || 'Starting...'}</span>
          <span>${progress}%</span>
        </div>
      </div>

      <div class="task-list">
        ${this.tasks.map(task => html`
          <div class="task ${task.status}">
            <div class="task-icon">${this._getTaskIcon(task.status)}</div>
            <div class="task-label">${task.label}</div>
          </div>
        `)}
      </div>
    `;
  }
}

customElements.define('step-progress', StepProgress);
