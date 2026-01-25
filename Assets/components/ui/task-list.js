import { LitElement, html, css } from 'lit';
import { srOnlyStyles } from './shared-styles.js';

/**
 * Task list component showing installation progress.
 * @element t3-task-list
 *
 * @prop {Array} tasks - Array of { id, label, status } objects
 *       status: 'pending' | 'running' | 'completed' | 'error'
 */
export class TaskList extends LitElement {
  static properties = {
    tasks: { type: Array }
  };

  static styles = [
    srOnlyStyles,
    css`
      :host { display: block; }

      .task-list {
        margin: 0 0 var(--spacing-md, 16px) 0;
        padding: 0;
        list-style: none;
      }

      .task {
        display: flex;
        align-items: center;
        padding: var(--spacing-xs, 4px) 0;
        font-size: 14px;
      }

      .task-icon {
        width: 20px;
        height: 20px;
        margin-right: var(--spacing-sm, 8px);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      .task.pending .task-icon { color: var(--color-text-light, #666); }
      .task.running .task-icon { color: var(--color-primary, #ff8700); animation: pulse 1s infinite; }
      .task.completed .task-icon { color: var(--color-success, #1cb841); }
      .task.error .task-icon { color: var(--color-error, #c83c3c); }

      .task-label { flex: 1; }
      .task.pending .task-label { color: var(--color-text-light, #666); }
      .task.running .task-label { font-weight: 600; }
      .task.completed .task-label { color: var(--color-success, #1cb841); }
      .task.error .task-label { color: var(--color-error, #c83c3c); }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `
  ];

  constructor() {
    super();
    this.tasks = [];
  }

  _getTaskIcon(status) {
    const icons = { pending: '\u25CB', running: '\u25CF', completed: '\u2713', error: '\u2717' };
    return icons[status] || '\u25CB';
  }

  _getStatusLabel(status) {
    const labels = { pending: 'Pending', running: 'In progress', completed: 'Completed', error: 'Error' };
    return labels[status] || 'Pending';
  }

  render() {
    return html`
      <ol class="task-list" aria-label="Installation tasks">
        ${this.tasks.map(task => html`
          <li class="task ${task.status}">
            <span class="task-icon" aria-hidden="true">${this._getTaskIcon(task.status)}</span>
            <span class="task-label">
              ${task.label}
              <span class="sr-only">- ${this._getStatusLabel(task.status)}</span>
            </span>
          </li>
        `)}
      </ol>
    `;
  }
}

customElements.define('t3-task-list', TaskList);
