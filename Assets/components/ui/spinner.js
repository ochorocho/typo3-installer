import { html, LitElement, css } from 'lit';

/**
 * Spinner component for loading states.
 * Uses global CSS from main.css (no Shadow DOM).
 * @element ui-spinner
 */
class Spinner extends LitElement {

  static properties = {
    size: { type: String }
  };

  static styles = css`
    :host {
      display: flex;
    }

    .spinner-wrapper {
      display: inline-flex;
      align-items: center;
      gap: 0.5em;
      line-height: 0;
      margin: 0;
    }

    .spinner-icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 1px solid var(--color-border);
      border-radius: 50%;
      border-top-color: var(--color-primary-dark);
      animation: spin 1s linear infinite;

      &.small {
        width: 11px;
        height: 11px;
      }
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
    }

    .spinner-dark {
      border-color: rgba(0, 0, 0, 0.1);
      border-top-color: var(--color-info);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `

  constructor() {
    super();
    this.size = '';
  }

  render() {
    return html`<p class="spinner-wrapper"><span class="spinner-icon ${this.size}"></span><slot></slot></p>`;
  }
}

customElements.define('ui-spinner', Spinner);
