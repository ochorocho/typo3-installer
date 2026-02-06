import { LitElement, html } from 'lit';
import './t3-icon.js';

/**
 * Task list showing installation progress.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element t3-task-list
 * @prop {Array} tasks - Array of { id, label, status } objects
 *       status: 'pending' | 'running' | 'completed' | 'error'
 */
export class TaskList extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    tasks: { type: Array }
  };

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
