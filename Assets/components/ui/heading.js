import { LitElement, css, html } from 'lit';

const tagMap = {
  1: (content) => html`<h1>${content}</h1>`,
  2: (content) => html`<h2>${content}</h2>`,
  3: (content) => html`<h3>${content}</h3>`,
  4: (content) => html`<h4>${content}</h4>`,
  5: (content) => html`<h5>${content}</h5>`,
  6: (content) => html`<h6>${content}</h6>`,
};

export class Heading extends LitElement {
  static properties = {
    level: { type: Number }
  };

  static styles = css`
    :host {
      display: block;
    }
    h1, h2, h3, h4, h5, h6 {
      margin: 0 0 var(--spacing-md, 16px) 0;
      line-height: 1.3;
    }
    h1 { font-size: 2rem; }
    h2 { font-size: 1.5rem; }
    h3 { font-size: 1.25rem; }
    h4 { font-size: 1.125rem; }
    h5 { font-size: 1rem; }
    h6 { font-size: 0.875rem; }
  `;

  constructor() {
    super();
    this.level = 2;
  }

  render() {
    const safeLevel = Math.min(6, Math.max(1, this.level || 2));
    const renderTag = tagMap[safeLevel];
    return renderTag(html`<slot></slot>`);
  }
}

customElements.define('t3-heading', Heading);
