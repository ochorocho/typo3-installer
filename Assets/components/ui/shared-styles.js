import { css } from 'lit';

/**
 * Shared button styles for all components
 */
export const buttonStyles = css`
  button {
    padding: var(--spacing-sm, 8px) var(--spacing-lg, 24px);
    border: none;
    border-radius: var(--border-radius, 4px);
    font-weight: 500;
    cursor: pointer;
  }

  button:focus-visible {
    outline: 2px solid var(--color-primary, #ff8700);
    outline-offset: 2px;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: var(--color-primary, #ff8700);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #e67a00;
  }

  .btn-secondary {
    background: var(--color-info, #2196f3);
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #1976d2;
  }

  .btn-outline {
    background: transparent;
    border: 1px solid var(--color-border, #ddd);
    color: var(--color-text, #333);
  }

  .btn-outline:hover:not(:disabled) {
    background: var(--color-bg, #f5f5f5);
  }

  .btn-success {
    background: var(--color-success, #1cb841);
    color: white;
  }

  .btn-success:hover:not(:disabled) {
    background: #179e38;
  }

  .btn-error {
    background: var(--color-error, #c83c3c);
    color: white;
  }

  .btn-error:hover:not(:disabled) {
    background: #a33232;
  }

  .btn-small {
    padding: var(--spacing-xs, 4px) var(--spacing-md, 16px);
    font-size: 13px;
  }
`;

/**
 * Shared form field styles
 * Includes base label/input styles for Shadow DOM components
 */
export const formStyles = css`
  .form-group {
    margin-bottom: var(--spacing-md, 16px);
  }

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

  input, select {
    width: 100%;
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
 * Spinner animation styles
 */
export const spinnerStyles = css`
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s linear infinite;
    margin-right: var(--spacing-sm, 8px);
  }

  .spinner-dark {
    border-color: rgba(0,0,0,0.1);
    border-top-color: var(--color-info, #2196f3);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

/**
 * Screen reader only utility (for components with Shadow DOM)
 * Global .sr-only is defined in main.css
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
 * Base host styles for step components
 * Required for Shadow DOM components (they don't inherit global styles)
 */
export const stepBaseStyles = css`
  :host {
    display: block;
  }

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
 * Alert styles for Shadow DOM components
 * Uses CSS variables from main.css
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
    color: var(--color-success, #1cb841);
  }

  .alert-error {
    background: var(--color-error-bg, #ffebee);
    border: 1px solid var(--color-error, #c83c3c);
    color: var(--color-error, #c83c3c);
  }

  .alert-warning {
    background: var(--color-warning-bg, #fff9e6);
    border: 1px solid var(--color-warning, #f76707);
    color: var(--color-warning, #f76707);
  }
`;
