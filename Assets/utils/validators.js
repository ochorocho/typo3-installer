/**
 * Centralized validation functions for the TYPO3 Installer.
 * Single source of truth for all validation rules.
 */

// =============================================================================
// Email Validation
// =============================================================================

/**
 * Validates an email address format.
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
  if (!email || !email.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Gets email validation error message.
 * @param {string} email - The email to validate
 * @returns {string|null} Error message or null if valid
 */
export function getEmailError(email) {
  if (!email || !email.trim()) {
    return 'Email address is required';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

// =============================================================================
// Password Validation
// =============================================================================

/**
 * Password validation requirements.
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true
};

/**
 * Validates a password against all requirements.
 * @param {string} password - The password to validate
 * @returns {boolean} True if password meets all requirements
 */
export function isValidPassword(password) {
  if (!password || password.length < PASSWORD_REQUIREMENTS.minLength) return false;
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) return false;
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) return false;
  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Gets password validation error message.
 * @param {string} password - The password to validate
 * @returns {string|null} Error message or null if valid
 */
export function getPasswordError(password) {
  if (!password || password.length < PASSWORD_REQUIREMENTS.minLength) {
    return `Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`;
  }
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (PASSWORD_REQUIREMENTS.requireNumber && !/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

/**
 * Calculates password strength.
 * @param {string} password - The password to evaluate
 * @returns {{ level: 'weak'|'medium'|'strong', label: string }}
 */
export function getPasswordStrength(password) {
  if (!password) return { level: 'weak', label: 'Weak' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { level: 'weak', label: 'Weak' };
  if (score <= 3) return { level: 'medium', label: 'Medium' };
  return { level: 'strong', label: 'Strong' };
}

// =============================================================================
// Username Validation
// =============================================================================

/**
 * Username validation requirements.
 */
export const USERNAME_REQUIREMENTS = {
  minLength: 3
};

/**
 * Validates a username.
 * @param {string} username - The username to validate
 * @returns {boolean} True if valid
 */
export function isValidUsername(username) {
  return username && username.length >= USERNAME_REQUIREMENTS.minLength;
}

/**
 * Gets username validation error message.
 * @param {string} username - The username to validate
 * @returns {string|null} Error message or null if valid
 */
export function getUsernameError(username) {
  if (!username || username.length < USERNAME_REQUIREMENTS.minLength) {
    return `Username must be at least ${USERNAME_REQUIREMENTS.minLength} characters`;
  }
  return null;
}

// =============================================================================
// URL Validation
// =============================================================================

/**
 * Validates a URL format.
 * @param {string} url - The URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidUrl(url) {
  if (!url || !url.trim()) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets URL validation error message.
 * @param {string} url - The URL to validate
 * @param {boolean} required - Whether the URL is required
 * @returns {string|null} Error message or null if valid
 */
export function getUrlError(url, required = true) {
  if (!url || !url.trim()) {
    return required ? 'URL is required' : null;
  }
  if (!isValidUrl(url)) {
    return 'Please enter a valid URL';
  }
  return null;
}

// =============================================================================
// Site Name Validation
// =============================================================================

/**
 * Validates a site name.
 * @param {string} name - The site name to validate
 * @returns {boolean} True if valid
 */
export function isValidSiteName(name) {
  return name && name.trim().length > 0;
}

/**
 * Gets site name validation error message.
 * @param {string} name - The site name to validate
 * @returns {string|null} Error message or null if valid
 */
export function getSiteNameError(name) {
  if (!name || !name.trim()) {
    return 'Site name is required';
  }
  return null;
}

// =============================================================================
// Admin Validation (Composite)
// =============================================================================

/**
 * Validates admin account data.
 * @param {Object} admin - Admin account data
 * @param {string} admin.username - Username
 * @param {string} admin.password - Password
 * @param {string} admin.email - Email
 * @returns {boolean} True if all admin fields are valid
 */
export function isValidAdmin(admin) {
  if (!admin) return false;
  return isValidUsername(admin.username) &&
         isValidPassword(admin.password) &&
         isValidEmail(admin.email);
}

// =============================================================================
// Site Validation (Composite)
// =============================================================================

/**
 * Validates site configuration data.
 * @param {Object} site - Site configuration data
 * @param {string} site.name - Site name
 * @param {string} site.baseUrl - Base URL
 * @returns {boolean} True if all site fields are valid
 */
export function isValidSite(site) {
  if (!site) return false;
  return isValidSiteName(site.name) && isValidUrl(site.baseUrl);
}
