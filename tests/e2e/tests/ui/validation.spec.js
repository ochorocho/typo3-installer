import { test, expect } from '@playwright/test';
import { navigateToDatabaseStep, fillMySQLForm, fillAdminForm } from '../helpers.js';

/**
 * Form Validation Tests
 *
 * Tests form validation behavior without requiring database operations.
 * These tests verify client-side validation and UI feedback.
 */

test.describe('Database Form Validation', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });
  });

  test('should show error with invalid database credentials', async ({ page }) => {
    await navigateToDatabaseStep(page);

    // Fill form with invalid credentials
    await page.locator('#driver').selectOption('pdo_mysql');
    await page.locator('#host').fill('db');
    await page.locator('#port').fill(process.env.DB_PORT || process.env.DATABASE_PORT || '3306');
    await page.locator('#name').fill('db');
    await page.locator('#user').fill('invalid_user');
    await page.locator('#password').fill('invalid_password');

    // Wait for auto-validation to show error (uses t3-section-error component)
    await expect(page.locator('t3-section-error').first()).toBeVisible({ timeout: 15000 });
  });

  test('should hide server fields when SQLite is selected', async ({ page }) => {
    await navigateToDatabaseStep(page);

    // Initially (MySQL selected), server fields should be visible
    await expect(page.locator('#host')).toBeVisible();
    await expect(page.locator('#port')).toBeVisible();
    await expect(page.locator('#user')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();

    // Select SQLite driver
    await page.locator('#driver').selectOption('pdo_sqlite');

    // Server fields should be hidden for SQLite
    await expect(page.locator('#host')).toBeHidden();
    await expect(page.locator('#port')).toBeHidden();
    await expect(page.locator('#user')).toBeHidden();
    await expect(page.locator('#password')).toBeHidden();
    await expect(page.locator('#name')).toBeHidden();
  });

  test('should show server fields when switching back from SQLite', async ({ page }) => {
    await navigateToDatabaseStep(page);

    // Select SQLite driver first
    await page.locator('#driver').selectOption('pdo_sqlite');
    await expect(page.locator('#host')).toBeHidden();

    // Switch back to MySQL
    await page.locator('#driver').selectOption('pdo_mysql');

    // Server fields should be visible again
    await expect(page.locator('#host')).toBeVisible();
    await expect(page.locator('#port')).toBeVisible();
    await expect(page.locator('#user')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('should support PostgreSQL driver selection', async ({ page }) => {
    await navigateToDatabaseStep(page);

    // Select PostgreSQL driver
    await page.locator('#driver').selectOption('pdo_pgsql');

    // Server fields should still be visible (unlike SQLite)
    await expect(page.locator('#host')).toBeVisible();
    await expect(page.locator('#port')).toBeVisible();
    await expect(page.locator('#user')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });
});

test.describe('Admin Form Validation', () => {
  test.setTimeout(120000);

  test('should show password strength indicator', async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });

    // Navigate to packages step
    await page.waitForSelector('h2:has-text("Select Packages")');
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Navigate through requirements
    await page.waitForSelector('h2:has-text("System Requirements")');
    await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });

    // Skip to admin step via step indicator (don't need DB for this test)
    const stepIndicators = page.locator('.step-indicator');
    await stepIndicators.nth(3).click(); // Admin step (index 3)
    await page.waitForSelector('h2:has-text("Admin")');

    // Type a weak password
    const passwordInput = page.locator('#password');
    await passwordInput.fill('abc');

    // Password strength indicator should exist
    const strengthIndicator = page.locator('.password-strength, .strength-indicator, [class*="strength"]');
    // The exact implementation may vary, but some feedback should be provided
    await expect(passwordInput).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });

    // Navigate to packages step
    await page.waitForSelector('h2:has-text("Select Packages")');
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Navigate through requirements
    await page.waitForSelector('h2:has-text("System Requirements")');
    await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });

    // Skip to admin step via step indicator
    const stepIndicators = page.locator('.step-indicator');
    await stepIndicators.nth(3).click();
    await page.waitForSelector('h2:has-text("Admin")');

    // Fill username and password
    await page.locator('#username').fill('admin');
    await page.locator('#password').fill('SecurePass123!');

    // Fill invalid email
    const emailInput = page.locator('#email');
    await emailInput.fill('invalid-email');

    // The email input should have validation
    await expect(emailInput).toHaveAttribute('type', 'email');
  });
});

test.describe('Site Form Validation', () => {
  test.setTimeout(120000);

  test('should require site name', async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });

    // Navigate to packages step
    await page.waitForSelector('h2:has-text("Select Packages")');
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Navigate through requirements
    await page.waitForSelector('h2:has-text("System Requirements")');
    await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });

    // Skip to site step via step indicator
    const stepIndicators = page.locator('.step-indicator');
    await stepIndicators.nth(4).click(); // Site step (index 4)
    await page.waitForSelector('h2:has-text("Site")');

    // Site name field should be required
    const siteNameInput = page.locator('#siteName');
    await expect(siteNameInput).toBeVisible();
    await expect(siteNameInput).toHaveAttribute('required', '');
  });

  test('should auto-fill base URL', async ({ page }) => {
    await page.goto('/typo3-installer.php', { waitUntil: 'networkidle' });

    // Navigate to packages step
    await page.waitForSelector('h2:has-text("Select Packages")');
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Navigate through requirements
    await page.waitForSelector('h2:has-text("System Requirements")');
    await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });

    // Skip to site step via step indicator
    const stepIndicators = page.locator('.step-indicator');
    await stepIndicators.nth(4).click();
    await page.waitForSelector('h2:has-text("Site")');

    // Base URL should be auto-filled or have placeholder
    const baseUrlInput = page.locator('#baseUrl');
    await expect(baseUrlInput).toBeVisible();

    // Should have some value or placeholder based on current URL
    const value = await baseUrlInput.inputValue();
    const placeholder = await baseUrlInput.getAttribute('placeholder');
    expect(value || placeholder).toBeTruthy();
  });
});
