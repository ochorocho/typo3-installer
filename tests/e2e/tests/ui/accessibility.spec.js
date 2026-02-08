import { test, expect } from '@playwright/test';
import { checkAccessibility, navigateToDatabaseStep } from '../helpers.js';

/**
 * WCAG Accessibility Tests
 *
 * Tests WCAG 2.2 accessibility compliance without requiring full installation.
 * Full workflow accessibility is tested in the full-flows tests.
 *
 * WCAG Requirements Tested:
 * - 1.4.3 Contrast (Minimum) - AA: Text 4.5:1, Large text 3:1
 * - 1.4.11 Non-text Contrast - AA: UI components 3:1
 */

test.describe('Accessibility - Light Mode', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });
  });

  test('packages step should be accessible', async ({ page }) => {
    await page.waitForSelector('h2:has-text("Select Packages")');
    await checkAccessibility(page, 'Packages - Light Mode');
  });

  test('requirements step should be accessible', async ({ page }) => {
    await page.waitForSelector('h2:has-text("Select Packages")');
    await page.locator('button.btn-primary:has-text("Continue")').click();

    await page.waitForSelector('h2:has-text("System Requirements")');
    await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });

    await checkAccessibility(page, 'Requirements - Light Mode');
  });

  test('database step should be accessible', async ({ page }) => {
    await navigateToDatabaseStep(page);
    await checkAccessibility(page, 'Database - Light Mode');
  });
});

test.describe('Accessibility - Dark Mode', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });
  });

  test('packages step should be accessible in dark mode', async ({ page }) => {
    await page.waitForSelector('h2:has-text("Select Packages")');

    // Switch to dark mode
    const darkModeButton = page.locator('t3-theme-toggle .theme-btn[title="Dark mode"]');
    if (await darkModeButton.isVisible()) {
      await darkModeButton.click();
      await page.waitForTimeout(500);
    }

    await checkAccessibility(page, 'Packages - Dark Mode');
  });

  test('requirements step should be accessible in dark mode', async ({ page }) => {
    // Switch to dark mode first
    const darkModeButton = page.locator('t3-theme-toggle .theme-btn[title="Dark mode"]');
    if (await darkModeButton.isVisible()) {
      await darkModeButton.click();
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('h2:has-text("Select Packages")');
    await page.locator('button.btn-primary:has-text("Continue")').click();

    await page.waitForSelector('h2:has-text("System Requirements")');
    await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });

    await checkAccessibility(page, 'Requirements - Dark Mode');
  });
});

test.describe('Accessibility - Error States', () => {
  test.setTimeout(120000);

  test('database error state should be accessible', async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });

    await navigateToDatabaseStep(page);

    // Fill form with invalid credentials to trigger error
    await page.locator('#driver').selectOption('pdo_mysql');
    await page.locator('#host').fill('invalid-host');
    await page.locator('#port').fill('3306');
    await page.locator('#name').fill('invalid_db');
    await page.locator('#user').fill('invalid_user');
    await page.locator('#password').fill('invalid_password');

    // Wait for auto-validation to show error (uses t3-section-error component)
    await page.locator('t3-section-error').waitFor({ state: 'visible', timeout: 30000 });

    // Check accessibility of error state
    await checkAccessibility(page, 'Database - Error State');
  });
});

test.describe('Accessibility - Theme Toggle', () => {
  test('theme toggle should switch modes correctly', async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });
    await page.waitForSelector('h2:has-text("Select Packages")');

    // Light mode first
    await checkAccessibility(page, 'Initial - Light Mode');

    // Switch to dark mode
    const darkModeButton = page.locator('t3-theme-toggle .theme-btn[title="Dark mode"]');
    if (await darkModeButton.isVisible()) {
      await darkModeButton.click();
      await page.waitForTimeout(500);

      await checkAccessibility(page, 'After Toggle - Dark Mode');

      // Switch back to light mode
      const lightModeButton = page.locator('t3-theme-toggle .theme-btn[title="Light mode"]');
      if (await lightModeButton.isVisible()) {
        await lightModeButton.click();
        await page.waitForTimeout(500);

        await checkAccessibility(page, 'After Toggle Back - Light Mode');
      }
    }
  });
});
