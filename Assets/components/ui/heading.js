import { LitElement, html, css } from 'lit';
import { hostStyles } from './shared-styles.js';
import { unsafeStatic, html as staticHtml } from 'lit/static-html.js';

/**
 * Dynamic heading component (h1-h6).
 * @element t3-heading
 * @prop {Number} level - Heading level 1-6 (default: 2)
 */
export class Heading extends LitElement {
  static properties = {
    level: { type: Number }
  };

  static styles = [
    hostStyles,
    css`
      h1, h2, h3, h4, h5, h6 {
        margin: 0 0 var(--spacing-md, 16px);
        line-height: 1.3;
        color: var(--color-text, #1a1a1a);
      }
      h1 { font-size: 2rem; }
      h2 { font-size: 1.5rem; }
      h3 { font-size: 1.25rem; }
      h4 { font-size: 1.125rem; }
      h5 { font-size: 1rem; }
      h6 { font-size: 0.875rem; }
    `
  ];

  constructor() {
    super();
    this.level = 2;
  }

  render() {
    const tag = unsafeStatic(`h${Math.min(6, Math.max(1, this.level || 2))}`);
    return staticHtml`<${tag}><slot></slot></${tag}>`;
  }
}

customElements.define('t3-heading', Heading);
