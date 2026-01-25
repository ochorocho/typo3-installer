import { LitElement, html, css } from 'lit';
import { hostStyles } from './shared-styles.js';

/**
 * Contextual error help with troubleshooting suggestions.
 * @element t3-error-help
 * @prop {Object} error - Error object with message, details, isNetworkError
 * @prop {String} context - Error context: 'database', 'requirements', 'installation'
 * @prop {String} title - Optional custom title override
 */
export class ErrorHelp extends LitElement {
  static properties = {
    error: { type: Object },
    context: { type: String },
    title: { type: String }
  };

  static styles = [
    hostStyles,
    css`
      .error-help {
        margin-top: var(--spacing-md, 16px);
        padding-top: var(--spacing-md, 16px);
        border-top: 1px solid rgba(200, 60, 60, 0.2);
        font-size: 13px;
        color: var(--color-text-light, #555);
      }
      .error-help-title {
        font-weight: 600;
        color: var(--color-text, #333);
        margin-bottom: var(--spacing-sm, 8px);
      }
      ul {
        margin: var(--spacing-xs, 4px) 0 0;
        padding-left: var(--spacing-lg, 24px);
      }
      li { margin-bottom: var(--spacing-xs, 4px); }
    `
  ];

  constructor() {
    super();
    this.context = 'general';
  }

  _getHelp() {
    if (!this.error) return null;
    const msg = (this.error.message || '').toLowerCase();
    const helpMap = {
      database: () => this._dbHelp(msg),
      requirements: () => this._reqHelp(msg),
      installation: () => this._installHelp(msg),
    };
    return (helpMap[this.context] || (() => this._generalHelp(msg)))();
  }

  _dbHelp(msg) {
    const items = [];
    if (msg.includes('access denied') || msg.includes('authentication')) {
      items.push('Verify username and password are correct', 'Check user has permission to access the database');
    }
    if (msg.includes('unknown database') || msg.includes('does not exist')) {
      items.push('The database must already exist - create it first', 'Check database name for typos');
    }
    if (msg.includes('connection refused') || msg.includes('could not connect')) {
      items.push('Verify database server is running', 'Check host and port are correct', 'Ensure no firewall is blocking the connection');
    }
    if (msg.includes('timeout')) {
      items.push('Database server may be slow or unreachable', 'Try again or check server status');
    }
    return { title: this.title || 'What you can try:', items: items.length ? items : ['Verify all connection details', 'Ensure database server is running', 'Check database exists', 'Verify user permissions'] };
  }

  _reqHelp(msg) {
    const items = ['Check internet connection', 'Refresh page and try again', 'Server may be temporarily unavailable'];
    if (msg.includes('timeout')) items.unshift('Request took too long - server might be busy');
    if (this.error.details?.statusCode === 500) items.unshift('Check PHP error logs');
    return { title: this.title || 'What you can try:', items };
  }

  _installHelp(msg) {
    if (this.error.isNetworkError) {
      return { title: this.title || 'Possible solutions:', items: ['Check internet connection', 'Verify server is running', 'Try refreshing and restarting installation'] };
    }
    if (msg.includes('database') || msg.includes('connection refused') || msg.includes('access denied')) {
      return { title: this.title || 'Database error. Try:', items: ['Verify database credentials', 'Ensure database server is running', 'Check user permissions', 'Go back and test connection again'] };
    }
    if (msg.includes('permission') || msg.includes('write')) {
      return { title: this.title || 'Permission error. Try:', items: ['Ensure web server has write permissions', 'Check file ownership', 'Verify directory permissions (755/644)'] };
    }
    if (msg.includes('composer') || msg.includes('package')) {
      return { title: this.title || 'Package error. Try:', items: ['Check internet connection', 'Verify Composer is working', 'Check disk space', 'Try fewer packages'] };
    }
    return { title: this.title || 'General troubleshooting:', items: ['Check server error logs', 'Verify PHP requirements', 'Ensure sufficient disk space', 'Try restarting installation'] };
  }

  _generalHelp(msg) {
    const items = [];
    if (msg.includes('timeout')) items.push('Request took too long - try again');
    if (msg.includes('network') || this.error.isNetworkError) items.push('Check internet connection');
    items.push('Try refreshing the page', 'Check browser console', 'Verify server is accessible');
    return { title: this.title || 'What you can try:', items };
  }

  render() {
    const help = this._getHelp();
    if (!help?.items?.length) return null;

    return html`
      <div class="error-help">
        <div class="error-help-title">${help.title}</div>
        <ul>${help.items.map(item => html`<li>${item}</li>`)}</ul>
      </div>
    `;
  }
}

customElements.define('t3-error-help', ErrorHelp);
