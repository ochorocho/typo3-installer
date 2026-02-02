/**
 * Centralized utility/helper functions for the TYPO3 Installer.
 */

// =============================================================================
// Debounce
// =============================================================================

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

  /**
   * Cancels any pending debounced call.
   */
  debounced.cancel = function() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Formats an error object into a standardized structure.
 * Handles various error types: API errors, network errors, and standard errors.
 *
 * @param {Error|Object|string} error - The error to format
 * @returns {{ message: string, details: string|null, isNetworkError: boolean }}
 *
 * @example
 * try {
 *   await apiClient.doSomething();
 * } catch (error) {
 *   const formatted = formatError(error);
 *   showNotification(formatted.message);
 * }
 */
export function formatError(error) {
  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      details: null,
      isNetworkError: false
    };
  }

  // Handle null/undefined
  if (!error) {
    return {
      message: 'An unknown error occurred',
      details: null,
      isNetworkError: false
    };
  }

  // Check for custom getUserMessage method (from API client)
  const message = error.getUserMessage?.() || error.message || 'An unexpected error occurred';

  // Extract details from various possible locations
  const details = error.details?.details || error.details || null;

  // Check for network errors
  const isNetworkError = error.isNetworkError ||
                         error.name === 'TypeError' ||
                         error.message?.toLowerCase().includes('network') ||
                         error.message?.toLowerCase().includes('fetch') ||
                         false;

  return {
    message,
    details,
    isNetworkError
  };
}

// =============================================================================
// Array Utilities
// =============================================================================

/**
 * Compares two arrays for equality (shallow comparison).
 * Useful for checking if selections have changed.
 *
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {boolean} True if arrays have same elements (order matters)
 */
export function arraysEqual(arr1, arr2) {
  if (!arr1 || !arr2) return arr1 === arr2;
  if (arr1.length !== arr2.length) return false;
  return arr1.every((item, index) => item === arr2[index]);
}

/**
 * Compares two arrays for equality ignoring order.
 * Useful for checking if package selections are equivalent.
 *
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {boolean} True if arrays have same elements (order independent)
 */
export function arraysEqualUnordered(arr1, arr2) {
  if (!arr1 || !arr2) return arr1 === arr2;
  if (arr1.length !== arr2.length) return false;
  const sorted1 = [...arr1].sort();
  const sorted2 = [...arr2].sort();
  return sorted1.every((item, index) => item === sorted2[index]);
}

// =============================================================================
// String Utilities
// =============================================================================

/**
 * Truncates a string to a maximum length with ellipsis.
 *
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string} Truncated string with ellipsis if needed
 */
export function truncate(str, maxLength = 50) {
  if (!str || str.length <= maxLength) return str || '';
  return str.substring(0, maxLength - 3) + '...';
}

// =============================================================================
// Time Utilities
// =============================================================================

/**
 * Formats a timestamp for display in terminal output.
 *
 * @param {Date} [date] - Date to format (defaults to now)
 * @returns {string} Formatted time string (HH:MM:SS)
 */
export function formatTimestamp(date = new Date()) {
  return date.toLocaleTimeString('en-US', { hour12: false });
}
