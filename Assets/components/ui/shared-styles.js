/**
 * Shared utilities for Lit components.
 * CSS styles are now in Assets/styles/main.css (no Shadow DOM).
 */

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
