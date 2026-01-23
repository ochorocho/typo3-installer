import {LitElement, html, css} from 'lit';
import {apiClient} from '../api/client.js';

export class StepProgress extends LitElement {
    static properties = {
        state: {type: Object},
        tasks: {type: Array},
        pollErrors: {type: Number},
        canRetry: {type: Boolean}
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
            color: var(--color-text-light, #333);
            margin-bottom: var(--spacing-lg, 24px);
        }

        .progress-container {
            margin-bottom: var(--spacing-xl, 32px);
        }

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
            color: var(--color-success, #1cb841);
        }

        .task.error .task-label {
            color: var(--color-error, #c83c3c);
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
            color: var(--color-text-light, #333);
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
            margin: 0 0 var(--spacing-md, 16px) 0;
            display: flex;
            align-items: center;
            gap: var(--spacing-sm, 8px);
        }

        .error-message h3::before {
            content: '⚠';
            font-size: 1.25rem;
        }

        .error-message .error-description {
            margin-bottom: var(--spacing-md, 16px);
            color: var(--color-text, #333);
        }

        .error-message .error-details {
            background: #fff;
            padding: var(--spacing-md, 16px);
            border-radius: var(--border-radius, 4px);
            overflow-x: auto;
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

        .error-message .error-help {
            margin-top: var(--spacing-md, 16px);
            padding-top: var(--spacing-md, 16px);
            border-top: 1px solid rgba(200, 60, 60, 0.2);
            font-size: 13px;
            color: var(--color-text-light, #333);
        }

        .error-message .error-help strong {
            display: block;
            margin-bottom: var(--spacing-xs, 4px);
        }

        .error-message .error-help ul {
            margin: var(--spacing-xs, 4px) 0 0 0;
            padding-left: var(--spacing-lg, 24px);
        }

        .warning-banner {
            padding: var(--spacing-md, 16px);
            background: #fff3e0;
            border: 1px solid var(--color-warning, #f76707);
            border-radius: var(--border-radius, 4px);
            margin-bottom: var(--spacing-lg, 24px);
            display: flex;
            align-items: center;
            gap: var(--spacing-md, 16px);
        }

        .warning-banner .warning-icon {
            font-size: 1.25rem;
        }

        .warning-banner .warning-text {
            flex: 1;
            font-size: 14px;
            color: var(--color-text, #333);
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

        .btn-primary {
            background: var(--color-primary, #ff8700);
            color: white;
        }

        .btn-primary:hover:not(:disabled) {
            background: #e67a00;
        }

        .btn-outline {
            background: transparent;
            border: 1px solid var(--color-border, #bbb);
            color: var(--color-text, #333);
        }

        .btn-outline:hover:not(:disabled) {
            background: var(--color-bg, #f4f4f4);
        }

        .btn-danger {
            background: var(--color-error, #c83c3c);
            color: white;
        }

        .btn-danger:hover:not(:disabled) {
            background: #b32d2d;
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
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
        this.pollErrors = 0;
        this.canRetry = false;
    }

    connectedCallback() {
        super.connectedCallback();
        if (!this.state?.installation?.running && !this.state?.installation?.completed && !this.state?.installation?.error) {
            this._startInstallation();
        } else if (this.state?.installation?.running) {
            this._startPolling();
        } else if (this.state?.installation?.error) {
            this.canRetry = true;
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._stopPolling();
    }

    async _startInstallation() {
        // Reset state
        this.pollErrors = 0;
        this.canRetry = false;
        this.tasks = this.tasks.map(t => ({...t, status: 'pending'}));

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
            this._handleError(error, 'Failed to start installation');
        }
    }

    _startPolling() {
        if (this._pollInterval) return;

        this._pollInterval = setInterval(async () => {
            try {
                const status = await apiClient.getStatus();

                // Reset error counter on successful poll
                this.pollErrors = 0;

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

                // Force re-render to update task list UI
                this.requestUpdate();

                if (status.completed || status.error) {
                    this._stopPolling();
                    if (status.error) {
                        this.canRetry = true;
                    }
                }
            } catch (error) {
                this.pollErrors++;
                console.error('Failed to poll status:', error);

                // After 5 consecutive poll failures, show error and allow retry
                if (this.pollErrors >= 5) {
                    this._stopPolling();
                    this._handleError(error, 'Lost connection to server during installation');
                }
            }
        }, 1000);
    }

    _stopPolling() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
    }

    _handleError(error, fallbackMessage) {
        const errorMessage = error.getUserMessage ? error.getUserMessage() : (error.message || fallbackMessage);
        const errorDetails = error.details ? JSON.stringify(error.details, null, 2) : null;

        this.canRetry = true;

        this.dispatchEvent(new CustomEvent('state-update', {
            bubbles: true,
            composed: true,
            detail: {
                installation: {
                    ...this.state.installation,
                    running: false,
                    error: {
                        message: errorMessage,
                        details: errorDetails,
                        isNetworkError: error.isNetworkError || false,
                        isTimeout: error.isTimeout || false
                    }
                }
            }
        }));

        this.requestUpdate();
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

    _handleRetry() {
        this._startInstallation();
    }

    _handleGoBack() {
        this.dispatchEvent(new CustomEvent('previous-step', {bubbles: true, composed: true}));
    }

    _getErrorHelp(error) {
        if (!error) return null;

        // Provide context-specific help based on error type
        if (error.isNetworkError) {
            return {
                title: 'Possible solutions:',
                items: [
                    'Check your internet connection',
                    'Verify the server is still running',
                    'Try refreshing the page and restarting the installation'
                ]
            };
        }

        if (error.isTimeout) {
            return {
                title: 'Possible solutions:',
                items: [
                    'The server might be overloaded - wait a moment and try again',
                    'Check server resources (memory, CPU)',
                    'Increase PHP timeout settings if possible'
                ]
            };
        }

        // Check for common error patterns in the message
        const message = (error.message || '').toLowerCase();

        if (message.includes('database') || message.includes('connection refused') || message.includes('access denied')) {
            return {
                title: 'Database-related error. Try:',
                items: [
                    'Verify database credentials are correct',
                    'Ensure the database server is running',
                    'Check that the database user has sufficient permissions',
                    'Go back and test the database connection again'
                ]
            };
        }

        if (message.includes('permission') || message.includes('denied') || message.includes('write')) {
            return {
                title: 'Permission error. Try:',
                items: [
                    'Ensure the web server has write permissions to the installation directory',
                    'Check file ownership (should be owned by web server user)',
                    'Verify directory permissions (typically 755 for directories, 644 for files)'
                ]
            };
        }

        if (message.includes('memory') || message.includes('allowed memory')) {
            return {
                title: 'Memory error. Try:',
                items: [
                    'Increase PHP memory_limit in php.ini (recommended: 256M or higher)',
                    'Restart the web server after changing PHP settings'
                ]
            };
        }

        if (message.includes('composer') || message.includes('package')) {
            return {
                title: 'Package installation error. Try:',
                items: [
                    'Check your internet connection',
                    'Verify Composer is working correctly',
                    'Check for disk space availability',
                    'Try selecting fewer packages initially'
                ]
            };
        }

        // Default help
        return {
            title: 'General troubleshooting:',
            items: [
                'Check the server error logs for more details',
                'Verify PHP meets all requirements',
                'Ensure sufficient disk space is available',
                'Try restarting the installation'
            ]
        };
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
            const error = installation.error;
            const help = this._getErrorHelp(error);

            return html`
                <div class="error-message" role="alert">
                    <h3>Installation Failed</h3>
                    <p class="error-description">${error.message || 'An unexpected error occurred during installation.'}</p>

                    ${error.details ? html`
                        <details>
                            <summary>Technical details</summary>
                            <div class="error-details">${error.details}</div>
                        </details>
                    ` : ''}

                    <div class="error-actions">
                        <button class="btn-primary" @click=${this._handleRetry}>
                            Retry Installation
                        </button>
                        <button class="btn-outline" @click=${this._handleGoBack}>
                            Go Back to Configuration
                        </button>
                    </div>

                    ${help ? html`
                        <div class="error-help">
                            <strong>${help.title}</strong>
                            <ul>
                                ${help.items.map(item => html`<li>${item}</li>`)}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        return html`
            <h2>Installing TYPO3</h2>
            <p>Please wait while TYPO3 is being installed. This may take a few minutes.</p>

            ${this.pollErrors > 0 ? html`
                <div class="warning-banner" role="alert">
                    <span class="warning-icon">⚠</span>
                    <span class="warning-text">
                        Having trouble connecting to the server (attempt ${this.pollErrors}/5).
                        The installation may still be running...
                    </span>
                </div>
            ` : ''}

            <div class="progress-container">
                <div class="progress-bar" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">
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
