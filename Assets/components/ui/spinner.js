import { html, LitElement } from 'lit';

/**
 * Spinner component for loading states.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element ui-spinner
 */
class Spinner extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    size: { type: String }
  };

  constructor() {
    super();
    this.size = '';
  }

  render() {
    return html`<p class="spinner-wrapper"><span class="spinner-icon ${this.size}"></span><slot></slot></p>`;
  }
}

customElements.define('ui-spinner', Spinner);
