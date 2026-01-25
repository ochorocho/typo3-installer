import { LitElement, html, css } from 'lit';

/**
 * Reusable loading skeleton component with shimmer animation.
 *
 * @element t3-loading-skeleton
 * @slot - Text content to display inside the skeleton
 *
 * @prop {String} height - CSS height value (e.g., "80px", "200px")
 */
export class LoadingSkeleton extends LitElement {
  static properties = {
    height: { type: String }
  };

  static styles = css`
    :host {
      display: block;
    }

    .loading-skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: var(--border-radius, 4px);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 14px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;

  constructor() {
    super();
    this.height = '80px';
  }

  render() {
    return html`
      <div class="loading-skeleton" style="min-height: ${this.height}">
        <slot>Loading...</slot>
      </div>
    `;
  }
}

customElements.define('t3-loading-skeleton', LoadingSkeleton);
