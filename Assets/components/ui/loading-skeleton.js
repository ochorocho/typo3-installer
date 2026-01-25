import { LitElement, html, css } from 'lit';
import { hostStyles } from './shared-styles.js';

/**
 * Loading skeleton placeholder.
 * @element t3-loading-skeleton
 * @slot - Text content to display
 * @prop {String} height - CSS height value (e.g., "80px")
 */
export class LoadingSkeleton extends LitElement {
  static properties = {
    height: { type: String }
  };

  static styles = [
    hostStyles,
    css`
      .skeleton {
        background: var(--color-bg-light, #f0f0f0);
        border-radius: var(--border-radius, 4px);
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-muted, #666);
        font-size: 14px;
      }
    `
  ];

  constructor() {
    super();
    this.height = '80px';
  }

  render() {
    return html`<div class="skeleton" style="min-height:${this.height}"><slot>Loading...</slot></div>`;
  }
}

customElements.define('t3-loading-skeleton', LoadingSkeleton);
