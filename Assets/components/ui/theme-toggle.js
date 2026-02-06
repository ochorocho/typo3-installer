import { LitElement, html } from 'lit';
import './t3-icon.js';

/**
 * Theme toggle component for switching between light, dark, and auto modes.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element t3-theme-toggle
 *
 * @fires theme-change - Dispatched when theme is changed, detail: { theme }
 */
export class ThemeToggle extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    theme: { type: String }
  };

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
