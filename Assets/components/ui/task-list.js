import { LitElement, html, css } from 'lit';
import { hostStyles, srOnlyStyles } from './shared-styles.js';
import './t3-icon.js';

/**
 * Task list showing installation progress.
 * @element t3-task-list
 * @prop {Array} tasks - Array of { id, label, status } objects
 *       status: 'pending' | 'running' | 'completed' | 'error'
 */
export class TaskList extends LitElement {
  static properties = {
    tasks: { type: Array }
  };

  static styles = [
    hostStyles,
    srOnlyStyles,
    css`
      .task-list {
        margin: 0 0 var(--spacing-md, 16px);
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
        width: 16px;
        height: 16px;
        margin-right: var(--spacing-sm, 8px);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .task.pending .task-icon { color: var(--color-text-light, #666); }
      .task.running .task-icon { color: var(--color-primary, #ff8700); }
      .task.completed .task-icon { color: var(--color-success, #1cb841); }
      .task.error .task-icon { color: var(--color-error, #c83c3c); }
      .task.pending { color: var(--color-text-light, #666); }
      .task.running { font-weight: 600; }
      .task.completed { color: var(--color-success, #1cb841); }
      .task.error { color: var(--color-error, #c83c3c); }
    `
  ];

  constructor() {
    super();
    this.tasks = [];
  }

  _getStatusIcon(status) {
    switch (status) {
      case 'running':
        return html`<t3-icon identifier="spinner-circle" spin></t3-icon>`;
      case 'completed':
        return html`<t3-icon identifier="actions-check"></t3-icon>`;
      case 'error':
        return html`<t3-icon identifier="actions-close"></t3-icon>`;
      case 'pending':
      default:
        return html`<t3-icon identifier="actions-circle"></t3-icon>`;
    }
  }

  render() {
    const labels = { pending: 'Pending', running: 'In progress', completed: 'Completed', error: 'Error' };

    return html`
      <ol class="task-list" aria-label="Installation tasks">
        ${this.tasks.map(t => html`
          <li class="task ${t.status}">
            <span class="task-icon" aria-hidden="true">${this._getStatusIcon(t.status)}</span>
            <span>${t.label}<span class="sr-only"> - ${labels[t.status] || 'Pending'}</span></span>
          </li>
        `)}
      </ol>
    `;
  }
}

customElements.define('t3-task-list', TaskList);
