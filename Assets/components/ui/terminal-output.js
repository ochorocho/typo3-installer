import { LitElement, html } from 'lit';
import { emit } from './shared-styles.js';

/**
 * Terminal-style output display component.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element t3-terminal-output
 *
 * @prop {Array} lines - Array of { text, type, timestamp, isStepMarker } objects
 * @prop {Boolean} autoScroll - Whether to auto-scroll to bottom
 * @fires toggle-autoscroll - When autoscroll button is clicked
 * @fires clear-output - When clear button is clicked
 */
export class TerminalOutput extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    lines: { type: Array },
    autoScroll: { type: Boolean, attribute: 'auto-scroll' }
  };

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
      const terminal = this.querySelector('.terminal-output');
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
