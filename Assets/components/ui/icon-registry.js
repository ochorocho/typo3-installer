/**
 * Static icon imports for tree-shaking optimization.
 * Only imported icons are bundled in the final build.
 *
 * Uses Vite's ?raw suffix to import SVGs as raw strings.
 */

// Status icons
import checkCircle from '@typo3/icons/dist/svgs/actions/actions-check-circle.svg?raw';
import exclamationCircle from '@typo3/icons/dist/svgs/actions/actions-exclamation-circle.svg?raw';
import exclamationTriangle from '@typo3/icons/dist/svgs/actions/actions-exclamation-triangle.svg?raw';
import infoCircleAlt from '@typo3/icons/dist/svgs/actions/actions-info-circle-alt.svg?raw';

// Action icons
import check from '@typo3/icons/dist/svgs/actions/actions-check.svg?raw';
import close from '@typo3/icons/dist/svgs/actions/actions-close.svg?raw';
import circle from '@typo3/icons/dist/svgs/actions/actions-circle.svg?raw';

// Theme icons
import brightnessHigh from '@typo3/icons/dist/svgs/actions/actions-brightness-high.svg?raw';
import moon from '@typo3/icons/dist/svgs/actions/actions-moon.svg?raw';
import cog from '@typo3/icons/dist/svgs/actions/actions-cog.svg?raw';

// Spinner
import spinnerCircle from '@typo3/icons/dist/svgs/spinner/spinner-circle.svg?raw';

// Navigation/Caret icons
import caretEnd from '@typo3/icons/dist/svgs/actions/actions-caret-end.svg?raw';
import caretDown from '@typo3/icons/dist/svgs/actions/actions-caret-down.svg?raw';

// Branding
import shieldTypo3 from '@typo3/icons/dist/svgs/actions/actions-shield-typo3.svg?raw';

/**
 * Icon registry mapping identifiers to raw SVG content.
 * @type {Record<string, string>}
 */
export const iconRegistry = {
  // Status icons
  'actions-check-circle': checkCircle,
  'actions-exclamation-circle': exclamationCircle,
  'actions-exclamation-triangle': exclamationTriangle,
  'actions-info-circle-alt': infoCircleAlt,

  // Action icons
  'actions-check': check,
  'actions-close': close,
  'actions-circle': circle,

  // Theme icons
  'actions-brightness-high': brightnessHigh,
  'actions-moon': moon,
  'actions-cog': cog,

  // Spinner
  'spinner-circle': spinnerCircle,

  // Navigation/Caret icons
  'actions-caret-end': caretEnd,
  'actions-caret-down': caretDown,

  // Branding
  'actions-shield-typo3': shieldTypo3,
};
