import { LitElement, html, css } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { iconRegistry } from './icon-registry.js';

/**
 * Icon component using @typo3/icons.
 *
 * @element t3-icon
 * @prop {String} identifier - Icon identifier (e.g., 'actions-check-circle')
 * @prop {String} size - Icon size: 'small' (16px), 'medium' (32px), 'large' (48px)
 * @prop {Boolean} spin - Enable spinning animation
 *
 * @example
 * <t3-icon identifier="actions-check-circle"></t3-icon>
 * <t3-icon identifier="spinner-circle" spin></t3-icon>
 * <t3-icon identifier="actions-exclamation-circle" size="medium"></t3-icon>
 */
export class T3Icon extends LitElement {
  static properties = {
    identifier: { type: String },
    size: { type: String, reflect: true },
    spin: { type: Boolean, reflect: true }
  };

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      vertical-align: middle;
    }

    :host([size="small"]),
    :host(:not([size])) {
      width: 16px;
      height: 16px;
    }

    :host([size="medium"]) {
      width: 24px;
      height: 24px;
    }

    :host([size="large"]) {
      width: 32px;
      height: 32px;
    }

    :host([size="auto"]) {
      width: 100%;
      height: auto;
    }

    svg {
      width: 100%;
      height: 100%;
      fill: currentColor;
    }

    :host([spin]) svg {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;

  constructor() {
    super();
    this.size = 'small';
    this.spin = false;
  }

  render() {
    const svgContent = iconRegistry[this.identifier];
    if (!svgContent) {
      console.warn(`T3Icon: Icon not found: ${this.identifier}`);
      return html`<slot></slot>`;
    }
    return html`${unsafeHTML(svgContent)}`;
  }
}

customElements.define('t3-icon', T3Icon);
