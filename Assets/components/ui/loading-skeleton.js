import { LitElement, html } from 'lit';

/**
 * Loading skeleton placeholder.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element t3-loading-skeleton
 * @slot - Text content to display
 * @prop {String} height - CSS height value (e.g., "80px")
 */
export class LoadingSkeleton extends LitElement {
  // Disable Shadow DOM - use light DOM for global CSS access
  createRenderRoot() { return this; }

  static properties = {
    height: { type: String }
  };

  constructor() {
    super();
    this.height = '80px';
  }

  render() {
    return html`<div class="skeleton" style="min-height:${this.height}"><slot>Loading...</slot></div>`;
  }
}

customElements.define('t3-loading-skeleton', LoadingSkeleton);
