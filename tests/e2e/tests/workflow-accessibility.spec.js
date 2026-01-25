import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.2 Accessibility Test with Complete Workflow
 *
 * Tests the complete installer workflow from packages selection to installation
 * completion while validating WCAG 2.2 accessibility compliance at each step.
 *
 * WCAG Requirements Tested:
 * - 1.4.3 Contrast (Minimum) - AA: Text 4.5:1, Large text 3:1
 * - 1.4.11 Non-text Contrast - AA: UI components 3:1
 */

/**
 * Run axe accessibility scan and check for violations
 * @param {import('@playwright/test').Page} page
 * @param {string} stepName - Name of the current step for error reporting
 */
async function checkAccessibility(page, stepName) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();

  // Focus on contrast violations but also report other WCAG violations
  const violations = results.violations;

  if (violations.length > 0) {
    const violationSummary = violations.map(v => {
      const nodes = v.nodes.map(n => n.target.join(' > ')).join('\n    - ');
      return `  ${v.id} (${v.impact}): ${v.description}\n    Affected elements:\n    - ${nodes}`;
    }).join('\n');

    console.log(`\nAccessibility violations at ${stepName}:\n${violationSummary}\n`);
  }

  // Fail test if there are any violations
  expect(violations, `WCAG violations found at ${stepName}`).toHaveLength(0);
}

/**
 * Fill database form with DDEV credentials
 * @param {import('@playwright/test').Page} page
 */
async function fillDatabaseForm(page) {
  await page.locator('#driver').selectOption('pdo_mysql');
  await page.locator('#host').fill('db');
  await page.locator('#port').fill('3306');
  await page.locator('#name').fill('db');
  await page.locator('#user').fill('db');
  await page.locator('#password').fill('db');
}

/**
 * Fill admin account form with valid test data
 * @param {import('@playwright/test').Page} page
 */
async function fillAdminForm(page) {
  await page.locator('#username').fill('admin');
  // Password must meet requirements: 8+ chars, uppercase, lowercase, number
  await page.locator('#password').fill('SecurePass123!');
  await page.locator('#email').fill('admin@example.com');
}

test.describe('Complete Workflow with WCAG Accessibility', () => {
  // Installation can take several minutes
  test.setTimeout(300000);

  test('complete workflow with accessibility checks at each step', async ({ page }) => {
    // Navigate to installer
    await page.goto('/typo3-installer.phar', { waitUntil: 'networkidle' });

    // ============================================
    // Step 1: Packages Selection
    // ============================================
    await page.waitForSelector('h2:has-text("Select Packages")');
    await expect(page.locator('h2')).toContainText('Select Packages');

    // Run accessibility scan on Packages step
    await checkAccessibility(page, 'Step 1: Packages');

    // Continue to next step
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // ============================================
    // Step 2: System Requirements
    // ============================================
    await page.waitForSelector('h2:has-text("System Requirements")');

    // Wait for requirements check to complete (can take up to 60 seconds)
    await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });

    // Run accessibility scan on Requirements step
    await checkAccessibility(page, 'Step 2: Requirements');

    // Verify requirements passed (Continue button enabled)
    const requirementsContinue = page.locator('button.btn-primary:has-text("Continue")');
    await expect(requirementsContinue).toBeEnabled({ timeout: 5000 });

    // Continue to next step
    await requirementsContinue.click();

    // ============================================
    // Step 3: Database Configuration
    // ============================================
    await page.waitForSelector('h2:has-text("Database Configuration")');

    // Fill database form with DDEV credentials
    await fillDatabaseForm(page);

    // Test database connection
    await page.locator('button:has-text("Test Connection")').click();

    // Wait for success message
    await page.locator('.alert-success, .success-message, [class*="success"]')
      .waitFor({ state: 'visible', timeout: 15000 });

    // Run accessibility scan on Database step (with success message visible)
    await checkAccessibility(page, 'Step 3: Database');

    // Continue to next step
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // ============================================
    // Step 4: Admin Account
    // ============================================
    await page.waitForSelector('h2:has-text("Admin")');

    // Fill admin form
    await fillAdminForm(page);

    // Run accessibility scan on Admin step
    await checkAccessibility(page, 'Step 4: Admin');

    // Continue to next step
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // ============================================
    // Step 5: Site Configuration
    // ============================================
    await page.waitForSelector('h2:has-text("Site")');

    // Fill site name (baseUrl is auto-filled)
    await page.locator('#siteName').fill('Test TYPO3 Site');

    // Run accessibility scan on Site step
    await checkAccessibility(page, 'Step 5: Site');

    // Start installation
    await page.locator('button:has-text("Start Installation")').click();

    // ============================================
    // Step 6: Installation Progress
    // ============================================
    await page.waitForSelector('h2:has-text("Installing TYPO3")');

    // Run accessibility scan on Progress step
    await checkAccessibility(page, 'Step 6: Progress');

    // Wait for installation to complete (up to 3 minutes)
    await page.locator('.success-message h3:has-text("Installation Complete")')
      .waitFor({ state: 'visible', timeout: 180000 });

    // Run accessibility scan on Success state
    await checkAccessibility(page, 'Step 6: Success');

    // Verify success message content
    await expect(page.locator('.success-message')).toBeVisible();

    // ============================================
    // Theme Toggle Test: Dark Mode
    // ============================================
    // Switch to dark mode
    const darkModeButton = page.locator('t3-theme-toggle .theme-btn[title="Dark mode"]');
    if (await darkModeButton.isVisible()) {
      await darkModeButton.click();

      // Allow theme transition to complete
      await page.waitForTimeout(500);

      // Run accessibility scan on Dark Mode
      await checkAccessibility(page, 'Dark Mode');

      // Switch back to light mode for cleanup
      const lightModeButton = page.locator('t3-theme-toggle .theme-btn[title="Light mode"]');
      if (await lightModeButton.isVisible()) {
        await lightModeButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('accessibility check on packages step with dark mode', async ({ page }) => {
    // Navigate to installer
    await page.goto('/typo3-installer.phar', { waitUntil: 'networkidle' });

    // Wait for packages step
    await page.waitForSelector('h2:has-text("Select Packages")');

    // Check light mode accessibility
    await checkAccessibility(page, 'Packages - Light Mode');

    // Switch to dark mode
    const darkModeButton = page.locator('t3-theme-toggle .theme-btn[title="Dark mode"]');
    if (await darkModeButton.isVisible()) {
      await darkModeButton.click();
      await page.waitForTimeout(500);

      // Check dark mode accessibility
      await checkAccessibility(page, 'Packages - Dark Mode');
    }
  });

  test('accessibility check on error states', async ({ page }) => {
    // Navigate to installer and go to database step
    await page.goto('/typo3-installer.phar', { waitUntil: 'networkidle' });

    // Navigate through packages
    await page.waitForSelector('h2:has-text("Select Packages")');
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Navigate through requirements
    await page.waitForSelector('h2:has-text("System Requirements")');
    await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Wait for database step
    await page.waitForSelector('h2:has-text("Database Configuration")');

    // Fill form with invalid credentials to trigger error
    await page.locator('#driver').selectOption('pdo_mysql');
    await page.locator('#host').fill('invalid-host');
    await page.locator('#port').fill('3306');
    await page.locator('#name').fill('invalid_db');
    await page.locator('#user').fill('invalid_user');
    await page.locator('#password').fill('invalid_password');

    // Test connection (will fail)
    await page.locator('button:has-text("Test Connection")').click();

    // Wait for error message
    await page.getByText('Error').waitFor({ state: 'visible', timeout: 15000 });

    // Check accessibility of error state
    await checkAccessibility(page, 'Database - Error State');
  });
});
