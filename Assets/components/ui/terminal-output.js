import { LitElement, html, css } from 'lit';
import { emit } from './shared-styles.js';

/**
 * Terminal-style output display component.
 * @element t3-terminal-output
 *
 * @prop {Array} lines - Array of { text, type, timestamp, isStepMarker } objects
 * @prop {Boolean} autoScroll - Whether to auto-scroll to bottom
 * @fires toggle-autoscroll - When autoscroll button is clicked
 * @fires clear-output - When clear button is clicked
 */
export class TerminalOutput extends LitElement {
  static properties = {
    lines: { type: Array },
    autoScroll: { type: Boolean, attribute: 'auto-scroll' }
  };

  static styles = css`
    :host { display: block; }

    .terminal-container {
      margin-top: var(--spacing-md, 16px);
      border: 1px solid var(--color-border, #bbb);
      border-radius: var(--border-radius, 4px);
      overflow: hidden;
    }

    .terminal-header {
      background: var(--terminal-header-bg, #2d2d2d);
      padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .terminal-title {
      color: var(--terminal-text-muted, #aaa);
      font-size: 12px;
      font-family: monospace;
    }

    .terminal-controls {
      display: flex;
      gap: var(--spacing-xs, 4px);
    }

    .terminal-controls button {
      background: transparent;
      border: 1px solid var(--terminal-border, #555);
      color: var(--terminal-text-muted, #aaa);
      font-size: 10px;
      padding: 2px 6px;
      border-radius: var(--border-radius, 4px);
      cursor: pointer;
    }

    .terminal-controls button:hover {
      background: var(--terminal-border, #444);
      color: #fff;
    }

    .terminal-controls button.active {
      background: var(--color-primary-accessible, #b35c00);
      border-color: var(--color-primary-accessible, #b35c00);
      color: #fff;
    }

    .terminal-output {
      background: var(--terminal-bg, #1e1e1e);
      color: var(--terminal-text, #d4d4d4);
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
      font-size: 12px;
      line-height: 1.4;
      padding: var(--spacing-sm, 8px);
      height: 300px;
      overflow-y: auto;
      word-break: break-word;
    }

    .terminal-output::-webkit-scrollbar { width: 8px; }
    .terminal-output::-webkit-scrollbar-track { background: var(--terminal-bg, #1e1e1e); }
    .terminal-output::-webkit-scrollbar-thumb { background: var(--terminal-scrollbar, #555); border-radius: var(--border-radius, 4px); }
    .terminal-output::-webkit-scrollbar-thumb:hover { background: var(--terminal-scrollbar-hover, #777); }

    .output-line { margin: 0; padding: 1px 0; }

    .output-line.step-marker {
      color: var(--terminal-step-marker, var(--color-primary, #ff8700));
      font-weight: bold;
      margin-top: 8px;
      border-top: 1px solid var(--terminal-border, #333);
      padding-top: 8px;
    }

    .output-line.step-marker:first-child {
      margin-top: 0;
      border-top: none;
      padding-top: 0;
    }

    .output-line .timestamp { color: var(--terminal-timestamp, #888); margin-right: 8px; }
    .output-line.error { color: var(--terminal-error, #f14c4c); }
    .output-line.success { color: var(--terminal-success, #4ec9b0); }
    .output-line.info { color: var(--terminal-info, #3794ff); }
  `;

  constructor() {
    super();
    this.lines = [];
    this.autoScroll = true;
  }

  updated(changed) {
    if (changed.has('lines') && this.autoScroll) {
      this._scrollToBottom();
    }
  }

  _scrollToBottom() {
    this.updateComplete.then(() => {
      const terminal = this.shadowRoot?.querySelector('.terminal-output');
      if (terminal) terminal.scrollTop = terminal.scrollHeight;
    });
  }

  _toggleAutoScroll() {
    emit(this, 'toggle-autoscroll');
  }

  render() {
    return html`
      <div class="terminal-container">
        <div class="terminal-header">
          <span class="terminal-title">Installation Output</span>
          <div class="terminal-controls">
            <button class="${this.autoScroll ? 'active' : ''}" @click=${this._toggleAutoScroll}>
              Auto-scroll
            </button>
          </div>
        </div>
        <div class="terminal-output" tabindex="0">
          ${this.lines.length === 0
            ? html`<div class="output-line info">Waiting for output...</div>`
            : this.lines.map(line => html`
                <div class="output-line ${line.type || ''} ${line.isStepMarker ? 'step-marker' : ''}">
                  ${!line.isStepMarker ? html`<span class="timestamp">${line.timestamp}</span>` : ''}
                  ${line.text}
                </div>
              `)
          }
        </div>
      </div>
    `;
  }
}

customElements.define('t3-terminal-output', TerminalOutput);
