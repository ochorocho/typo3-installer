/**
 * Centralized utility/helper functions for the TYPO3 Installer.
 */

/**
 * Creates a debounced version of a function.
 * The function will only be called after the specified delay has passed
 * since the last invocation.
 *
 * @param {Function} fn - The function to debounce
 * @param {number} ms - Delay in milliseconds (default: 300)
 * @returns {Function} Debounced function with cancel() method
 *
 * @example
 * const debouncedSearch = debounce((query) => {
 *   apiClient.search(query);
 * }, 500);
 *
 * // Later, if needed:
 * debouncedSearch.cancel();
 */
export function debounce(fn, ms = 300) {
  let timer = null;

  const debounced = function(...args) {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, ms);
  };

  debounced.cancel = function() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}
