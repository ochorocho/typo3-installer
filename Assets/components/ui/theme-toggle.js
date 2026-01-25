import { LitElement, html, css } from 'lit';
import './t3-icon.js';

/**
 * Theme toggle component for switching between light, dark, and auto modes.
 * @element t3-theme-toggle
 *
 * @fires theme-change - Dispatched when theme is changed, detail: { theme }
 */
export class ThemeToggle extends LitElement {
  static properties = {
    theme: { type: String }
  };

  static styles = css`
    :host {
      display: block;
    }

    .theme-toggle {
      display: flex;
      gap: 2px;
      background: var(--color-bg-light, #f0f0f0);
      border-radius: var(--border-radius, 4px);
      padding: 2px;
    }

    .theme-btn {
      padding: 4px 8px;
      border: none;
      background: transparent;
      color: var(--color-text-muted, #666);
      font-size: 12px;
      font-weight: 500;
      border-radius: 3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .theme-btn:hover {
      background: var(--color-bg-white, #fff);
      color: var(--color-text, #333);
    }

    .theme-btn.active {
      background: var(--color-bg-white, #fff);
      color: var(--color-primary, #ff8700);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .theme-btn:focus-visible {
      outline: 2px solid var(--color-primary, #ff8700);
      outline-offset: 1px;
    }

    .theme-btn t3-icon {
      width: 14px;
      height: 14px;
    }
  `;

  constructor() {
    super();
    this.theme = this._loadTheme();
  }

  connectedCallback() {
    super.connectedCallback();
    this._applyTheme(this.theme);
  }

  _loadTheme() {
    const saved = localStorage.getItem('t3-installer-theme');
    return saved || 'auto';
  }

  _saveTheme(theme) {
    localStorage.setItem('t3-installer-theme', theme);
  }

  _applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  _setTheme(theme) {
    this.theme = theme;
    this._saveTheme(theme);
    this._applyTheme(theme);
    this.dispatchEvent(new CustomEvent('theme-change', {
      bubbles: true,
      composed: true,
      detail: { theme }
    }));
  }

  render() {
    return html`
      <div class="theme-toggle" role="group" aria-label="Theme selection">
        <button
          class="theme-btn ${this.theme === 'light' ? 'active' : ''}"
          @click=${() => this._setTheme('light')}
          aria-pressed=${this.theme === 'light'}
          title="Light mode"
        >
          <t3-icon identifier="actions-brightness-high"></t3-icon>
          Light
        </button>
        <button
          class="theme-btn ${this.theme === 'dark' ? 'active' : ''}"
          @click=${() => this._setTheme('dark')}
          aria-pressed=${this.theme === 'dark'}
          title="Dark mode"
        >
          <t3-icon identifier="actions-moon"></t3-icon>
          Dark
        </button>
        <button
          class="theme-btn ${this.theme === 'auto' ? 'active' : ''}"
          @click=${() => this._setTheme('auto')}
          aria-pressed=${this.theme === 'auto'}
          title="Auto-detect based on system settings"
        >
          <t3-icon identifier="actions-cog"></t3-icon>
          Auto
        </button>
      </div>
    `;
  }
}

customElements.define('t3-theme-toggle', ThemeToggle);
