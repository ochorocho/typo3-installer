import { css } from 'lit';

/**
 * Base host styles - use in all components
 */
export const hostStyles = css`
  :host { display: block; }
`;

/**
 * Base typography for step components (headings, paragraphs)
 */
export const typographyStyles = css`
  p {
    color: var(--color-text-light, #666);
    margin: 0 0 var(--spacing-lg, 24px) 0;
  }
  h2 {
    margin: 0 0 var(--spacing-md, 16px) 0;
    font-size: 1.5rem;
    line-height: 1.3;
    color: var(--color-text, #1a1a1a);
  }
  h3 {
    margin: 0 0 var(--spacing-md, 16px) 0;
    font-size: 1.25rem;
    line-height: 1.3;
    color: var(--color-text, #1a1a1a);
  }
`;

/**
 * Combined step base styles (host + typography)
 */
export const stepBaseStyles = [hostStyles, typographyStyles];

/**
 * Button styles
 */
export const buttonStyles = css`
  button,
  a.btn-primary,
  a.btn-secondary,
  a.btn-outline,
  a.btn-success,
  a.btn-error {
    padding: var(--spacing-sm, 8px) var(--spacing-lg, 24px);
    border: none;
    border-radius: var(--border-radius, 4px);
    font-weight: 500;
    cursor: pointer;
  }
  a.btn-primary,
  a.btn-secondary,
  a.btn-outline,
  a.btn-success,
  a.btn-error {
    text-decoration: none;
    display: inline-block;
  }
  button:focus-visible,
  a.btn-primary:focus-visible,
  a.btn-secondary:focus-visible,
  a.btn-outline:focus-visible,
  a.btn-success:focus-visible,
  a.btn-error:focus-visible {
    outline: 2px solid var(--color-primary, #ff8700);
    outline-offset: 2px;
  }
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    filter: grayscale(30%);
  }
  .btn-primary {
    background: var(--color-primary-accessible, #b35c00);
    color: white;
  }
  .btn-primary:hover:not(:disabled) { background: var(--color-primary-dark, #e67a00); }
  a.btn-primary:hover { background: var(--color-primary-dark, #e67a00); }
  .btn-secondary {
    background: var(--color-info, #0078d4);
    color: white;
  }
  .btn-secondary:hover:not(:disabled) { background: var(--color-info-dark, #005a9e); }
  a.btn-secondary:hover { background: var(--color-info-dark, #005a9e); }
  .btn-outline {
    background: transparent;
    border: 1px solid var(--color-border, #bbb);
    color: var(--color-text, #333);
  }
  .btn-outline:hover:not(:disabled) { background: var(--color-bg-light, #fafafa); }
  a.btn-outline:hover { background: var(--color-bg-light, #fafafa); }
  .btn-success {
    background: var(--color-success-btn, #137526);
    color: white;
  }
  .btn-success:hover:not(:disabled) { background: var(--color-success-btn-hover, #0a6228); }
  a.btn-success:hover { background: var(--color-success-btn-hover, #0a6228); }
  .btn-error {
    background: var(--color-error, #c83c3c);
    color: white;
  }
  .btn-error:hover:not(:disabled) { background: var(--color-error-dark, #a33232); }
  a.btn-error:hover { background: var(--color-error-dark, #a33232); }
  .btn-small {
    padding: var(--spacing-xs, 4px) var(--spacing-md, 16px);
    font-size: 13px;
  }
`;

/**
 * Form field styles
 */
export const formStyles = css`
  .form-group { margin-bottom: var(--spacing-md, 16px); }
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md, 16px);
  }
  label {
    display: block;
    font-weight: 600;
    margin-bottom: var(--spacing-xs, 4px);
    color: var(--color-text, #1a1a1a);
  }
  label.required::after {
    content: ' *';
    color: var(--color-error, #c83c3c);
  }
  input, select {
    width: 100%;
    box-sizing: border-box;
    padding: 6px 8px;
    border: 1px solid var(--color-input-border, #bbb);
    border-radius: var(--border-radius, 4px);
    font-size: var(--font-size-base, 14px);
    background: var(--color-input-bg, #fff);
    color: var(--color-input-text, #1a1a1a);
  }
  input:focus, select:focus {
    outline: none;
    border-color: var(--color-primary, #ff8700);
    box-shadow: 0 0 0 3px rgba(255, 135, 0, 0.15);
  }
  input:focus-visible, select:focus-visible {
    outline: 2px solid var(--color-primary, #ff8700);
    outline-offset: 2px;
  }
  input.error, input[aria-invalid="true"] {
    border-color: var(--color-error, #c83c3c);
  }
  .help-text {
    font-size: var(--font-size-sm, 12px);
    color: var(--color-text-light, #666);
    margin-top: var(--spacing-xs, 4px);
  }
  .error-text {
    font-size: var(--font-size-sm, 12px);
    color: var(--color-error, #c83c3c);
    margin-top: var(--spacing-xs, 4px);
  }
`;

/**
 * Alert/message styles
 */
export const alertStyles = css`
  .alert {
    padding: var(--spacing-md, 16px);
    border-radius: var(--border-radius, 4px);
    margin-bottom: var(--spacing-lg, 24px);
  }
  .alert-success {
    background: var(--color-success-bg, #e8f5e9);
    border: 1px solid var(--color-success, #1cb841);
    color: var(--color-success-accessible, #137526);
  }
  .alert-error {
    background: var(--color-error-bg, #ffebee);
    border: 1px solid var(--color-error, #c83c3c);
    color: var(--color-error-accessible, #b33636);
  }
  .alert-warning {
    background: var(--color-warning-bg, #fff9e6);
    border: 1px solid var(--color-warning, #f76707);
    color: var(--color-warning, #f76707);
  }
`;

/**
 * Screen reader only utility
 */
export const srOnlyStyles = css`
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;

/**
 * Helper to dispatch bubbling composed events
 * @param {LitElement} element - The element dispatching the event
 * @param {string} name - Event name
 * @param {any} detail - Event detail (optional)
 */
export function emit(element, name, detail = undefined) {
  element.dispatchEvent(new CustomEvent(name, {
    bubbles: true,
    composed: true,
    detail
  }));
}
