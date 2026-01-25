/**
 * Component Exports
 *
 * This module provides all component exports for the TYPO3 Installer.
 *
 * Structure:
 * - ui/          Reusable UI building blocks (forms, buttons, alerts, etc.)
 * - components/  Step components (wizard pages that compose UI components)
 */

// Re-export all UI components
export * from './ui/index.js';

// Step components (wizard pages)
export { StepPackages } from './step-packages.js';
export { StepRequirements } from './step-requirements.js';
export { StepDatabase } from './step-database.js';
export { StepAdmin } from './step-admin.js';
export { StepSite } from './step-site.js';
export { StepProgress } from './step-progress.js';

// Main app
export { InstallerApp } from './installer-app.js';
