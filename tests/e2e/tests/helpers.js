import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';
import { execSync } from 'node:child_process';

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
 * @param {string} [options.host] - Database host (default: env.DB_HOST or 'db')
 * @param {string} [options.port] - Database port (default: env DB_PORT/DATABASE_PORT or '3306')
 * @param {string} [options.name] - Database name (default: env.DB_NAME or 'db')
 * @param {string} [options.user] - Database user (default: env.DB_USER or 'db')
 * @param {string} [options.password] - Database password (default: env.DB_PASSWORD or 'db')
 */
export async function fillMySQLForm(page, options = {}) {
  const {
    host = process.env.DB_HOST || 'db',
    port = process.env.DB_PORT || process.env.DATABASE_PORT || '3306',
    name = process.env.DB_NAME || 'db',
    user = process.env.DB_USER || 'db',
    password = process.env.DB_PASSWORD || 'db'
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
 * @param {string} [options.host] - Database host (default: env.DB_HOST or 'postgres')
 * @param {string} [options.port] - Database port (default: env DB_PORT/DATABASE_PORT or '5432')
 * @param {string} [options.name] - Database name (default: env.DB_NAME or 'db')
 * @param {string} [options.user] - Database user (default: env.DB_USER or 'db')
 * @param {string} [options.password] - Database password (default: env.DB_PASSWORD or 'db')
 */
export async function fillPostgreSQLForm(page, options = {}) {
  const {
    host = process.env.DB_HOST || 'postgres',
    port = process.env.DB_PORT || process.env.DATABASE_PORT || '5432',
    name = process.env.DB_NAME || 'db',
    user = process.env.DB_USER || 'db',
    password = process.env.DB_PASSWORD || 'db'
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

  // Assert all 9 tasks are completed
  const completedTasks = page.locator('t3-task-list .task.completed');
  await expect(completedTasks).toHaveCount(9);
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

/**
 * Verify TYPO3 Backend is accessible and login works.
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options] - Optional credentials override
 * @param {string} [options.username='admin'] - Admin username
 * @param {string} [options.password='SecurePass123!'] - Admin password
 */
export async function verifyTYPO3Backend(page, options = {}) {
  const {
    username = 'admin',
    password = 'SecurePass123!'
  } = options;

  // Get the backend URL from the success button
  const backendLink = page.locator('.success-buttons a.btn-success');
  const backendUrl = await backendLink.getAttribute('href');

  // First load after fresh installation triggers TYPO3 cache compilation;
  // reload once to get a stable, fully cached backend.
  // If PHP-FPM is still starting in CI, retry the initial load once.
  await page.goto(backendUrl, { waitUntil: 'networkidle' });
  const loginButton = page.getByRole('button', { name: 'Login' });
  await page.waitForLoadState('networkidle');
  await page.reload({ waitUntil: 'networkidle' });

  // Attempt login with retries — fresh TYPO3 installs may reject the first
  // login while caches are still compiling or sessions are not yet stable.
  const maxLoginAttempts = 3;
  for (let attempt = 1; attempt <= maxLoginAttempts; attempt++) {
    await page.waitForLoadState('networkidle');
    // Wait for login form to be fully interactive
    await loginButton.waitFor({ state: 'visible', timeout: 60000 });

    // Fill login credentials sequentially to trigger TYPO3's JS event listeners
    await page.getByRole('textbox', { name: 'Username' }).pressSequentially(username, { delay: 50 });
    await page.getByRole('textbox', { name: 'Password' }).pressSequentially(password, { delay: 50 });

    // Submit login form — use Promise.all to avoid race between click and navigation
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Login' }).click();
    const navigated = await navigationPromise;

    if (navigated) {
      await page.waitForLoadState('networkidle');
      break;
    }

    // Wait before retrying to let TYPO3 finish cache warmup
    await page.waitForLoadState('networkidle');
    await page.reload({ waitUntil: 'networkidle' });
  }

  // Verify successful login - TYPO3 backend shows module menu
  await page.getByRole('navigation', { name: 'Module Menu' })
    .waitFor({ state: 'visible', timeout: 60000 });
}

/**
 * Reset MySQL/MariaDB database for testing.
 * Drops and recreates the database.
 * Uses environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
 */
export function resetMySQLDatabase() {
  const host = process.env.DB_HOST || 'db';
  const user = process.env.DB_USER || 'db';
  const password = process.env.DB_PASSWORD || 'db';
  const name = process.env.DB_NAME || 'db';
  console.log(`Resetting MySQL database at ${host}...`);
  execSync(`mysql -u${user} -h ${host} -p${password} -e "DROP DATABASE IF EXISTS ${name}; CREATE DATABASE ${name};"`, {
    stdio: 'inherit'
  });
}

/**
 * Reset PostgreSQL database for testing.
 * Drops and recreates the database.
 * Uses environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
 */
export function resetPostgreSQLDatabase() {
  const host = process.env.DB_HOST || 'postgres';
  const user = process.env.DB_USER || 'db';
  const password = process.env.DB_PASSWORD || 'db';
  const name = process.env.DB_NAME || 'db';
  console.log(`Resetting PostgreSQL database at ${host}...`);
  execSync(`PGPASSWORD=${password} psql -h ${host} -U ${user} -d postgres -c "DROP DATABASE IF EXISTS ${name};" -c "CREATE DATABASE ${name};"`, {
    stdio: 'inherit'
  });
}

/**
 * Reset SQLite database for testing.
 * Removes all SQLite files from the var/sqlite directory.
 * Uses environment variable: INSTALL_DIR
 */
export function resetSQLiteDatabase() {
  if (process.env.REMOTE_TEST) return;
  const installDir = process.env.INSTALL_DIR || '/var/www/html/test-installer-root';
  console.log('Resetting SQLite database...');
  try {
    execSync(`rm -f "${installDir}/var/sqlite"/*.sqlite`, {
      stdio: 'inherit'
    });
  } catch {
    // Ignore errors if directory or files don't exist
  }
}

/**
 * Reset TYPO3 installation files (shared across all DB types).
 * Removes config, var, vendor, and other generated files.
 * Uses environment variable: INSTALL_DIR
 */
export function resetTYPO3Installation() {
  if (process.env.REMOTE_TEST) return;
  const installDir = process.env.INSTALL_DIR || '/var/www/html/test-installer-root';
  console.log('Resetting TYPO3 installation files...');
  const commands = [
    `rm -Rf "${installDir}/config"`,
    `rm -Rf "${installDir}/var"`,
    `rm -Rf "${installDir}/vendor"`,
    `rm -Rf "${installDir}/composer"*`,
    `rm -Rf "${installDir}/public/_assets"`,
    `rm -Rf "${installDir}/public/fileadmin"`,
    `rm -Rf "${installDir}/public/typo3temp"`,
    `rm -Rf "${installDir}/public/index.php"`,
  ];
  commands.forEach(cmd => {
    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch {
      // Ignore errors if files don't exist
    }
  });
}
