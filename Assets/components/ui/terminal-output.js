import { LitElement, html } from 'lit';
import { emit } from './shared-styles.js';

/**
 * Terminal-style output display component.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element t3-terminal-output
 *
 * @prop {Array} lines - Array of { text, type, timestamp, isStepMarker } objects
 */
export class TerminalOutput extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    lines: { type: Array },
  };

  constructor() {
    super();
    this.lines = [];
  }

  updated(changed) {
    if (changed.has('lines')) {
      this._scrollToBottom();
    }
  }

  _scrollToBottom() {
    this.updateComplete.then(() => {
      const terminal = this.querySelector('.terminal-output');
      if (terminal) terminal.scrollTop = terminal.scrollHeight;
    });
  }

  render() {
    return html`
      <div class="terminal-container">
        <div class="terminal-header">
          <span class="terminal-title">Installation Output</span>
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
