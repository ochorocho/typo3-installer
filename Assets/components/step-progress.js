import {LitElement, html, css} from 'lit';
import {apiClient} from '../api/client.js';

export class StepProgress extends LitElement {
    static properties = {
        state: {type: Object},
        tasks: {type: Array}
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
            background: var(--color-primary, #ff8700);
            border-radius: 4px;
        }

        .progress-text {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: var(--color-text-light, #666);
        }

        .task-list {
            margin: 0 0 var(--spacing-lg, 24px) 0;
            padding: 0;
            list-style: none;
        }

        .task {
            display: flex;
            align-items: center;
            padding: var(--spacing-sm, 8px) 0;
            border-bottom: 1px solid var(--color-border, #bbb);
        }

        .task:last-child {
            border-bottom: none;
        }

        .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
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
        }

        .task.completed .task-icon {
            color: var(--color-success, #1cb841);
        }

        .task.error .task-icon {
            color: var(--color-error, #c83c3c);
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
            color: var(--color-success, #1cb841);
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
            border: 1px solid var(--color-error, #c83c3c);
            border-radius: var(--border-radius, 4px);
            margin-bottom: var(--spacing-lg, 24px);
        }

        .error-message h3 {
            color: var(--color-error, #c83c3c);
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

        button, .btn-success {
            padding: var(--spacing-sm, 8px) var(--spacing-lg, 24px);
            border: none;
            border-radius: var(--border-radius, 4px);
            font-weight: 500;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
        }

        button:focus-visible, .btn-success:focus-visible {
            outline: 2px solid var(--color-primary, #ff8700);
            outline-offset: 2px;
        }

        .btn-success {
            background: var(--color-success, #1cb841);
            color: white;
        }

        .btn-success:hover {
            background: #179e38;
        }
    `;

    constructor() {
        super();
        this.tasks = [
            {id: 'init', label: 'Initializing Composer project', status: 'pending'},
            {id: 'composer', label: 'Installing TYPO3 packages', status: 'pending'},
            {id: 'database', label: 'Setting up database schema', status: 'pending'},
            {id: 'admin', label: 'Creating admin account', status: 'pending'},
            {id: 'site', label: 'Configuring site', status: 'pending'},
            {id: 'cache', label: 'Clearing caches', status: 'pending'},
            {id: 'finalize', label: 'Finalizing installation', status: 'pending'}
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
                typo3Version: this.state.typo3Version || '13.4',
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
            {id: 'init', min: 10, max: 15},
            {id: 'composer', min: 15, max: 50},
            {id: 'database', min: 50, max: 70},
            {id: 'admin', min: 70, max: 80},
            {id: 'site', min: 80, max: 90},
            {id: 'cache', min: 90, max: 98},
            {id: 'finalize', min: 98, max: 100}
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

            return {...task, status};
        });
    }

    _getTaskIcon(status) {
        switch (status) {
            case 'pending':
                return '\u25CB';
            case 'running':
                return '\u25CF';
            case 'completed':
                return '\u2713';
            case 'error':
                return '\u2717';
            default:
                return '\u25CB';
        }
    }

    render() {
        const installation = this.state?.installation || {};
        const progress = installation.progress || 0;

        if (installation.completed) {
            console.log(installation)

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

            <ol class="task-list" aria-label="Installation tasks">
                ${this.tasks.map(task => html`
                    <li class="task ${task.status}">
                        <span class="task-icon" aria-hidden="true">${this._getTaskIcon(task.status)}</span>
                        <span class="task-label">
                            ${task.label}
                            <span class="sr-only">- ${task.status === 'completed' ? 'Completed' : task.status === 'running' ? 'In progress' : 'Pending'}</span>
                        </span>
                    </li>
                `)}
            </ol>
        `;
    }
}

customElements.define('step-progress', StepProgress);
