import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

/**
 * Shared test helpers for TYPO3 Installer E2E tests
 */

/**
 * Navigate from packages step through requirements step.
 * Clicks Continue on packages, waits for requirements check to complete.
 * @param {import('@playwright/test').Page} page
 */
export async function navigateToRequirements(page) {
  await page.waitForSelector('h2:has-text("Select Packages")');
  await page.locator('button.btn-primary:has-text("Continue")').click();
  await page.waitForSelector('h2:has-text("System Requirements")');
  await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });
}

/**
 * Navigate from packages step through to the database step.
 * @param {import('@playwright/test').Page} page
 */
export async function navigateToDatabaseStep(page) {
  await navigateToRequirements(page);
  const continueBtn = page.locator('button.btn-primary:has-text("Continue")');
  await expect(continueBtn).toBeEnabled({ timeout: 5000 });
  await continueBtn.click();
  await page.waitForSelector('h2:has-text("Database Configuration")');
}

/**
 * Fill database form with MySQL/MariaDB credentials.
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options] - Optional credentials override
 * @param {string} [options.host='db'] - Database host
 * @param {string} [options.port='3306'] - Database port
 * @param {string} [options.name='db'] - Database name
 * @param {string} [options.user='db'] - Database user
 * @param {string} [options.password='db'] - Database password
 */
export async function fillMySQLForm(page, options = {}) {
  const {
    host = 'db',
    port = '3306',
    name = 'db',
    user = 'db',
    password = 'db'
  } = options;

  await page.locator('#driver').selectOption('pdo_mysql');
  await page.locator('#host').fill(host);
  await page.locator('#port').fill(port);
  await page.locator('#name').fill(name);
  await page.locator('#user').fill(user);
  await page.locator('#password').fill(password);
}

/**
 * Fill database form with PostgreSQL credentials.
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options] - Optional credentials override
 * @param {string} [options.host='postgres'] - Database host
 * @param {string} [options.port='5432'] - Database port
 * @param {string} [options.name='db'] - Database name
 * @param {string} [options.user='db'] - Database user
 * @param {string} [options.password='db'] - Database password
 */
export async function fillPostgreSQLForm(page, options = {}) {
  const {
    host = 'postgres',
    port = '5432',
    name = 'db',
    user = 'db',
    password = 'db'
  } = options;

  await page.locator('#driver').selectOption('pdo_pgsql');
  await page.locator('#host').fill(host);
  await page.locator('#port').fill(port);
  await page.locator('#name').fill(name);
  await page.locator('#user').fill(user);
  await page.locator('#password').fill(password);
}

/**
 * Fill database form with SQLite configuration.
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options] - Optional configuration override
 * @param {string} [options.path='/tmp/typo3-e2e-test.sqlite'] - SQLite file path
 */
export async function fillSQLiteForm(page, options = {}) {
  const { path = '/tmp/typo3-e2e-test.sqlite' } = options;

  await page.locator('#driver').selectOption('pdo_sqlite');
  // SQLite uses the database name field for the file path
  await page.locator('#name').fill(path);
}

/**
 * Fill admin account form with valid test data.
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options] - Optional credentials override
 * @param {string} [options.username='admin'] - Admin username
 * @param {string} [options.password='SecurePass123!'] - Admin password
 * @param {string} [options.email='admin@example.com'] - Admin email
 */
export async function fillAdminForm(page, options = {}) {
  const {
    username = 'admin',
    password = 'SecurePass123!',
    email = 'admin@example.com'
  } = options;

  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#email').fill(email);
}

/**
 * Fill site configuration form.
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options] - Optional configuration override
 * @param {string} [options.siteName='Test TYPO3 Site'] - Site name
 */
export async function fillSiteForm(page, options = {}) {
  const { siteName = 'Test TYPO3 Site' } = options;

  await page.locator('#siteName').fill(siteName);
}

/**
 * Complete installation and verify success.
 * @param {import('@playwright/test').Page} page
 */
export async function completeInstallationAndVerify(page) {
  // Click Start Installation
  await page.locator('button:has-text("Start Installation")').click();

  // Wait for installation to start
  await page.waitForSelector('h2:has-text("Installing TYPO3")');

  // Wait for installation to complete (up to 180s)
  await page.locator('.success-message h3:has-text("Installation Complete!")')
    .waitFor({ state: 'visible', timeout: 180000 });

  // Assert session storage is cleared
  const storedState = await page.evaluate(() => sessionStorage.getItem('typo3-installer-state'));
  expect(storedState).toBeNull();

  // Assert heading changed to "TYPO3 Installed"
  await expect(page.locator('h2')).toContainText('TYPO3 Installed');

  // Assert "Go to TYPO3 Backend" button
  const backendLink = page.locator('.success-buttons a.btn-success');
  await expect(backendLink).toBeVisible();
  await expect(backendLink).toContainText('Go to TYPO3 Backend');

  // Assert "Go to Frontend" button
  const frontendLink = page.locator('.success-buttons a.btn-outline');
  await expect(frontendLink).toBeVisible();
  await expect(frontendLink).toContainText('Go to Frontend');

  // Assert progress bar at 100%
  const progressFill = page.locator('.progress-fill');
  await expect(progressFill).toHaveAttribute('style', 'width: 100%');

  // Assert all 6 tasks are completed
  const completedTasks = page.locator('t3-task-list .task.completed');
  await expect(completedTasks).toHaveCount(6);
}

/**
 * Run axe accessibility scan and check for violations.
 * @param {import('@playwright/test').Page} page
 * @param {string} stepName - Name of the current step for error reporting
 * @param {Object} [options] - Optional settings
 * @param {boolean} [options.failOnViolation=true] - Whether to fail the test on violations
 */
export async function checkAccessibility(page, stepName, options = {}) {
  const { failOnViolation = true } = options;

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();

  const violations = results.violations;

  if (violations.length > 0) {
    const violationSummary = violations.map(v => {
      const nodes = v.nodes.map(n => n.target.join(' > ')).join('\n    - ');
      return `  ${v.id} (${v.impact}): ${v.description}\n    Affected elements:\n    - ${nodes}`;
    }).join('\n');

    console.log(`\nAccessibility violations at ${stepName}:\n${violationSummary}\n`);
  }

  // Fail test if there are any violations (unless failOnViolation is false)
  if (failOnViolation) {
    expect(violations, `WCAG violations found at ${stepName}`).toHaveLength(0);
  }

  return violations;
}

/**
 * Wait for database connection test result (success or error).
 * @param {import('@playwright/test').Page} page
 * @param {number} [timeout=15000] - Timeout in milliseconds
 * @returns {Promise<boolean>} - True if connection succeeded (empty database), false otherwise
 */
export async function waitForDatabaseTestResult(page, timeout = 15000) {
  const result = page.locator('.alert-success, t3-section-error');
  await result.first().waitFor({ state: 'visible', timeout });

  const successAlert = page.locator('.alert-success');
  return await successAlert.isVisible();
}
