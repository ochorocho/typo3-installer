/**
 * Step completion validation for the TYPO3 Installer wizard.
 * Centralizes the logic for determining if each step is complete.
 */

import { isValidAdmin, isValidSite } from './validators.js';

/**
 * Step validator functions.
 * Each function takes the full installer state and returns true if the step is complete.
 */
export const stepValidators = {
  /**
   * Packages step is complete when at least one package is selected.
   */
  packages: (state) => {
    return (state?.packages?.selected?.length ?? 0) > 0;
  },

  /**
   * Requirements step is complete when all requirements have passed.
   */
  requirements: (state) => {
    return state?.requirements?.passed === true;
  },

  /**
   * Database step is complete when connection has been tested and is valid.
   * Works for all driver types including SQLite.
   */
  database: (state) => {
    return state?.database?.tested === true && state?.database?.valid === true;
  },

  /**
   * Admin step is complete when all admin fields are valid.
   */
  admin: (state) => {
    return isValidAdmin(state?.admin);
  },

  /**
   * Site step is complete when site name and base URL are valid.
   */
  site: (state) => {
    return isValidSite(state?.site);
  },

  /**
   * Install step is complete when installation has finished.
   */
  install: (state) => {
    return state?.installation?.completed === true;
  }
};

/**
 * Checks if a specific step is complete.
 *
 * @param {string} stepId - The step identifier (packages, requirements, database, admin, site, install)
 * @param {Object} state - The full installer state
 * @returns {boolean} True if the step is complete
 *
 * @example
 * if (isStepComplete('admin', state)) {
 *   enableNextButton();
 * }
 */
export function isStepComplete(stepId, state) {
  const validator = stepValidators[stepId];
  if (!validator) {
    console.warn(`Unknown step: ${stepId}`);
    return false;
  }
  return validator(state);
}

/**
 * Checks if all prerequisite steps are complete (all steps before the install step).
 * Used to determine if installation can begin.
 *
 * @param {Object} state - The full installer state
 * @returns {boolean} True if all prerequisite steps are complete
 *
 * @example
 * if (canStartInstallation(state)) {
 *   startInstallation();
 * }
 */
export function canStartInstallation(state) {
  const prerequisiteSteps = ['packages', 'requirements', 'database', 'admin', 'site'];
  return prerequisiteSteps.every(stepId => isStepComplete(stepId, state));
}

/**
 * Gets a list of incomplete prerequisite steps.
 * Useful for showing which steps need attention.
 *
 * @param {Object} state - The full installer state
 * @returns {string[]} Array of incomplete step IDs
 *
 * @example
 * const incomplete = getIncompleteSteps(state);
 * if (incomplete.includes('database')) {
 *   showDatabaseWarning();
 * }
 */
export function getIncompleteSteps(state) {
  const prerequisiteSteps = ['packages', 'requirements', 'database', 'admin', 'site'];
  return prerequisiteSteps.filter(stepId => !isStepComplete(stepId, state));
}

/**
 * Gets a list of incomplete prerequisite steps with human-readable names.
 * Useful for showing which steps need attention with navigation links.
 *
 * @param {Object} state - The full installer state
 * @returns {{ id: string, name: string }[]} Array of incomplete step details
 */
export function getIncompleteStepDetails(state) {
  const stepNames = {
    packages: 'Packages',
    requirements: 'Requirements',
    database: 'Database',
    admin: 'Admin Account',
    site: 'Site Configuration'
  };
  return getIncompleteSteps(state).map(id => ({ id, name: stepNames[id] || id }));
}

/**
 * Validates the full installation configuration.
 * More thorough check that includes field-level validation.
 *
 * @param {Object} state - The full installer state
 * @returns {{ valid: boolean, missingFields: string[] }}
 *
 * @example
 * const validation = validateInstallationConfig(state);
 * if (!validation.valid) {
 *   showError(`Missing: ${validation.missingFields.join(', ')}`);
 * }
 */
export function validateInstallationConfig(state) {
  const missingFields = [];
  const db = state?.database || {};
  const admin = state?.admin || {};
  const site = state?.site || {};
  const packages = state?.packages || {};

  // Packages validation
  if (!packages.selected?.length) {
    missingFields.push('Packages selection');
  }

  // Database validation (server-based drivers need host/user, file-based only need name)
  if (db.driver !== 'pdo_sqlite') {
    if (!db.name) missingFields.push('Database name');
    if (!db.host) missingFields.push('Database host');
    if (!db.user) missingFields.push('Database user');
  }

  // Admin validation
  if (!admin.username) missingFields.push('Admin username');
  if (!admin.password) missingFields.push('Admin password');
  if (!admin.email) missingFields.push('Admin email');

  // Site validation
  if (!site.name) missingFields.push('Site name');
  if (!site.baseUrl) missingFields.push('Site URL');

  return {
    valid: missingFields.length === 0,
    missingFields
  };
}
