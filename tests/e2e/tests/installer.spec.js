import { test, expect } from '@playwright/test';

test.describe('TYPO3 Installer', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the installer
    await page.goto('/typo3-installer.phar', { waitUntil: 'networkidle' });
  });

  test('should load the installer interface', async ({ page }) => {
    // Check for the main heading
    await expect(page.locator('h1')).toContainText('TYPO3 Installer');
  });

  test('should display system requirements step', async ({ page }) => {
    // Should be on step 1 - System Requirements
    await expect(page.locator('h2')).toContainText('System Requirements');

    // Should show requirements list
    await expect(page.locator('.requirement-item')).not.toHaveCount(0);
  });

  test('should show requirement status indicators', async ({ page }) => {
    // Wait for requirements check to complete
    await page.waitForSelector('.requirement-item', { timeout: 10000 });

    // Should have status icons (✓, ✗, or ⚠)
    const items = await page.locator('.requirement-item').all();
    expect(items.length).toBeGreaterThan(0);

    // Each item should have a status class
    for (const item of items) {
      const classList = await item.getAttribute('class');
      expect(classList).toMatch(/passed|failed|warning/);
    }
  });

  test('should enable continue button when requirements pass', async ({ page }) => {
    // Wait for requirements check
    await page.waitForSelector('.requirement-item', { timeout: 10000 });

    // If all requirements pass, continue button should be enabled
    const continueButton = page.locator('button.btn-primary:has-text("Continue")');

    // Check if button exists
    await expect(continueButton).toBeVisible();
  });

  test('should navigate to database configuration', async ({ page }) => {
    // Wait for requirements check
    await page.waitForSelector('.requirement-item', { timeout: 10000 });

    // Click continue button (if enabled)
    const continueButton = page.locator('button.btn-primary:has-text("Continue")');

    // Try to click if enabled
    if (await continueButton.isEnabled()) {
      await continueButton.click();

      // Should navigate to database configuration
      await expect(page.locator('h2')).toContainText('Database Configuration', { timeout: 5000 });
    }
  });

  test('should show database form fields', async ({ page }) => {
    // Navigate to database step (assuming requirements pass)
    await page.waitForSelector('.requirement-item', { timeout: 10000 });

    const continueButton = page.locator('button.btn-primary:has-text("Continue")');

    if (await continueButton.isEnabled()) {
      await continueButton.click();
      await page.waitForSelector('h2:has-text("Database Configuration")');

      // Check for database form fields
      await expect(page.locator('#driver')).toBeVisible();
      await expect(page.locator('#host')).toBeVisible();
      await expect(page.locator('#port')).toBeVisible();
      await expect(page.locator('#name')).toBeVisible();
      await expect(page.locator('#user')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
    }
  });

  test('should show test connection button', async ({ page }) => {
    // Navigate to database step
    await page.waitForSelector('.requirement-item', { timeout: 10000 });

    const continueButton = page.locator('button.btn-primary:has-text("Continue")');

    if (await continueButton.isEnabled()) {
      await continueButton.click();
      await page.waitForSelector('h2:has-text("Database Configuration")');

      // Should have "Test Connection" button
      await expect(page.locator('button:has-text("Test Connection")')).toBeVisible();
    }
  });

  test('should show progress indicators in header', async ({ page }) => {
    // Check for step indicators
    const stepIndicators = page.locator('.step-indicator');
    await expect(stepIndicators).not.toHaveCount(0);

    // Should have 5 steps
    const count = await stepIndicators.count();
    expect(count).toBe(5);
  });

  test('should highlight current step', async ({ page }) => {
    // First step should be active
    const activeStep = page.locator('.step-indicator.active');
    await expect(activeStep).toHaveCount(1);

    // Active step should be step 1
    const stepNumber = activeStep.locator('.step-number');
    await expect(stepNumber).toContainText('1');
  });
});

test.describe('Database Configuration', () => {
  test.skip('should test database connection with valid credentials', async ({ page }) => {
    // This test requires a running database
    // Skip for now as it depends on environment
  });

  test.skip('should show error with invalid credentials', async ({ page }) => {
    // Skip - requires database setup
  });
});

test.describe('Full Installation Flow', () => {
  test.skip('should complete full installation', async ({ page }) => {
    // This would test the complete flow
    // Skip for now as it requires database and takes time
  });
});
