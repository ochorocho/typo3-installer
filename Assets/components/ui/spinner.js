import {html, LitElement, css} from "lit";

class Spinner extends LitElement {

  static properties = {
      size: {type: String}
  }

  static styles = css`
    .wrapper {
      display: inline-flex;
      align-items: center;
      gap: 0.5em;
      line-height: 0;
      margin: 0;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid var(--color-border-light);
      border-radius: 50%;
      border-top-color: var(--color-primary-dark);
      animation: spin 1s linear infinite;

      &.small { width: 11px; height: 11px; }
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `

  constructor() {
    super();
    this.size = '';
  }

  render() {
    return html`<p class="wrapper"><span class="spinner ${this.size}"></span><slot></slot></p>`
  }
}

customElements.define('ui-spinner', Spinner);
