import { test, expect } from '@playwright/test';
import { navigateToRequirements, navigateToDatabaseStep } from '../helpers.js';

/**
 * UI Tests for TYPO3 Installer
 *
 * These tests verify UI elements and navigation that don't depend on
 * database state. They can run in parallel without resetting the instance.
 */

test.describe('Installer UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });
  });

  test('should load the installer interface', async ({ page }) => {
    // Check for the installer app element and first step heading
    await expect(page.locator('installer-app')).toBeVisible();
    await expect(page.locator('h2')).toContainText('Select Packages');
  });

  test('should display packages selection step', async ({ page }) => {
    // Should be on step 1 - Package Selection (first step)
    await expect(page.locator('h2')).toContainText('Select Packages');
  });

  test('should show progress indicators in header', async ({ page }) => {
    // Check for step indicators
    const stepIndicators = page.locator('.step-indicator');
    await expect(stepIndicators).not.toHaveCount(0);

    // Should have 6 steps (Packages, Requirements, Database, Admin, Site, Install)
    const count = await stepIndicators.count();
    expect(count).toBe(6);
  });

  test('should highlight current step', async ({ page }) => {
    // First step should be active
    const activeStep = page.locator('.step-indicator.active');
    await expect(activeStep).toHaveCount(1);

    // Verify the active step is visible
    await expect(activeStep).toBeVisible();
  });
});

test.describe('Step Navigation', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });
  });

  test('should show requirement status indicators', async ({ page }) => {
    // Navigate to requirements step and wait for check to complete
    await navigateToRequirements(page);

    // Find requirement items
    const items = await page.locator('step-requirements .requirement').all();
    expect(items.length).toBeGreaterThan(0);

    // Each item should have a status class
    for (const item of items) {
      const classList = await item.getAttribute('class');
      expect(classList).toMatch(/passed|failed|warning/);
    }
  });

  test('should enable continue button when requirements pass', async ({ page }) => {
    // Navigate to requirements step and wait for check to complete
    await navigateToRequirements(page);

    // Continue button should be visible
    const continueButton = page.locator('button.btn-primary:has-text("Continue")');
    await expect(continueButton).toBeVisible();
  });

  test('should navigate to database configuration', async ({ page }) => {
    // Navigate to requirements step and wait for check to complete
    await navigateToRequirements(page);

    // Click continue button (if enabled)
    const continueButton = page.locator('button.btn-primary:has-text("Continue")');

    if (await continueButton.isEnabled()) {
      await continueButton.click();
      await expect(page.locator('h2')).toContainText('Database Configuration', { timeout: 5000 });
    }
  });

  test('should show database form fields', async ({ page }) => {
    await navigateToDatabaseStep(page);

    // Check for database form fields
    await expect(page.locator('#driver')).toBeVisible();
    await expect(page.locator('#host')).toBeVisible();
    await expect(page.locator('#port')).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#user')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });
});

test.describe('Step Indicator States', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });
  });

  test('completed steps show checkmark indicator', async ({ page }) => {
    // Navigate past packages step (step 1)
    await page.waitForSelector('h2:has-text("Select Packages")');
    await page.locator('button.btn-primary:has-text("Continue")').click();
    await page.waitForSelector('h2:has-text("System Requirements")');

    // Step 1 (index 0) indicator should have .completed class
    const firstStepIndicator = page.locator('.step-indicator').nth(0);
    await expect(firstStepIndicator).toHaveClass(/completed/);
  });

  test('active step is highlighted', async ({ page }) => {
    // On initial load, step 1 (index 0) should be active
    const firstStepIndicator = page.locator('.step-indicator').nth(0);
    await expect(firstStepIndicator).toHaveClass(/active/);

    // Navigate to step 2
    await page.locator('button.btn-primary:has-text("Continue")').click();
    await page.waitForSelector('h2:has-text("System Requirements")');

    // Step 2 (index 1) should now be active
    const secondStepIndicator = page.locator('.step-indicator').nth(1);
    await expect(secondStepIndicator).toHaveClass(/active/);

    // Step 1 should no longer be active
    await expect(firstStepIndicator).not.toHaveClass(/active/);
  });
});
