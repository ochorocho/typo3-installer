import { LitElement, html, css } from 'lit';

/**
 * @element t3-error-help
 * @description Reusable error help component that provides contextual troubleshooting suggestions
 *
 * @property {Object} error - Error object with message, details, isNetworkError
 * @property {String} context - Error context: 'database', 'requirements', 'installation'
 * @property {String} title - Optional custom title override
 */
export class ErrorHelp extends LitElement {
  static properties = {
    error: { type: Object },
    context: { type: String },
    title: { type: String }
  };

  static styles = css`
    :host {
      display: block;
    }

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

    .error-help ul {
      margin: var(--spacing-xs, 4px) 0 0 0;
      padding-left: var(--spacing-lg, 24px);
    }

    .error-help li {
      margin-bottom: var(--spacing-xs, 4px);
    }
  `;

  constructor() {
    super();
    this.error = null;
    this.context = 'general';
    this.title = '';
  }

  /**
   * Get contextual help based on error and context
   * @returns {{ title: string, items: string[] } | null}
   */
  _getHelp() {
    if (!this.error) return null;

    const message = (this.error.message || '').toLowerCase();

    // Context-specific error patterns
    switch (this.context) {
      case 'database':
        return this._getDatabaseHelp(message);
      case 'requirements':
        return this._getRequirementsHelp(message);
      case 'installation':
        return this._getInstallationHelp(message);
      default:
        return this._getGeneralHelp(message);
    }
  }

  /**
   * Database connection error help (from step-database.js)
   */
  _getDatabaseHelp(message) {
    const items = [];

    if (message.includes('access denied') || message.includes('authentication')) {
      items.push('Verify the username and password are correct');
      items.push('Check that the user has permission to access the database');
    }

    if (message.includes('unknown database') || message.includes('does not exist')) {
      items.push('The database must already exist - create it first');
      items.push('Check the database name for typos');
    }

    if (message.includes('connection refused') || message.includes('could not connect')) {
      items.push('Verify the database server is running');
      items.push('Check the host and port are correct');
      items.push('Ensure no firewall is blocking the connection');
    }

    if (message.includes('timeout') || this.error.details?.isTimeout) {
      items.push('The database server may be slow or unreachable');
      items.push('Try again or check the server status');
    }

    // Default suggestions if no specific match
    if (items.length === 0) {
      items.push('Verify all connection details are correct');
      items.push('Ensure the database server is running and accessible');
      items.push('Check that the database exists');
      items.push('Verify the user has sufficient permissions');
    }

    return {
      title: this.title || 'What you can try:',
      items
    };
  }

  /**
   * Requirements check error help (from step-requirements.js)
   */
  _getRequirementsHelp(message) {
    const items = [
      'Check your internet connection',
      'Try refreshing the page and starting again',
      'The server may be temporarily unavailable',
      'Check the browser console for more details'
    ];

    if (this.error.details?.isTimeout || message.includes('timeout')) {
      items.unshift('The request took too long - the server might be busy');
    }

    if (this.error.details?.statusCode === 500) {
      items.unshift('Check the PHP error logs on the server');
    }

    return {
      title: this.title || 'What you can try:',
      items
    };
  }

  /**
   * Installation error help (from step-progress.js)
   */
  _getInstallationHelp(message) {
    if (this.error.isNetworkError) {
      return {
        title: this.title || 'Possible solutions:',
        items: [
          'Check your internet connection',
          'Verify the server is still running',
          'Try refreshing the page and restarting the installation'
        ]
      };
    }

    if (message.includes('database') || message.includes('connection refused') || message.includes('access denied')) {
      return {
        title: this.title || 'Database-related error. Try:',
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
        title: this.title || 'Permission error. Try:',
        items: [
          'Ensure the web server has write permissions to the installation directory',
          'Check file ownership (should be owned by web server user)',
          'Verify directory permissions (typically 755 for directories, 644 for files)'
        ]
      };
    }

    if (message.includes('composer') || message.includes('package')) {
      return {
        title: this.title || 'Package installation error. Try:',
        items: [
          'Check your internet connection',
          'Verify Composer is working correctly',
          'Check for disk space availability',
          'Try selecting fewer packages initially'
        ]
      };
    }

    return {
      title: this.title || 'General troubleshooting:',
      items: [
        'Check the server error logs for more details',
        'Verify PHP meets all requirements',
        'Ensure sufficient disk space is available',
        'Try restarting the installation'
      ]
    };
  }

  /**
   * General fallback help
   */
  _getGeneralHelp(message) {
    const items = [];

    if (message.includes('timeout') || this.error.details?.isTimeout) {
      items.push('The request took too long - try again');
    }

    if (message.includes('network') || this.error.isNetworkError) {
      items.push('Check your internet connection');
    }

    items.push('Try refreshing the page');
    items.push('Check the browser console for more details');
    items.push('Verify the server is accessible');

    return {
      title: this.title || 'What you can try:',
      items
    };
  }

  render() {
    const help = this._getHelp();

    if (!help || !help.items?.length) {
      return null;
    }

    return html`
      <div class="error-help">
        <div class="error-help-title">${help.title}</div>
        <ul>
          ${help.items.map(item => html`<li>${item}</li>`)}
        </ul>
      </div>
    `;
  }
}

customElements.define('t3-error-help', ErrorHelp);
