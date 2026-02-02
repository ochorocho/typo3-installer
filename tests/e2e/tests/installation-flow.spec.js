import { test, expect } from '@playwright/test';

/**
 * Navigate from packages step through requirements step.
 * Clicks Continue on packages, waits for requirements check to complete.
 * @param {import('@playwright/test').Page} page
 */
async function navigateToRequirements(page) {
  await page.waitForSelector('h2:has-text("Select Packages")');
  await page.locator('button.btn-primary:has-text("Continue")').click();
  await page.waitForSelector('h2:has-text("System Requirements")');
  await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });
}

/**
 * Navigate from packages step through to the database step.
 * @param {import('@playwright/test').Page} page
 */
async function navigateToDatabaseStep(page) {
  await navigateToRequirements(page);
  const continueBtn = page.locator('button.btn-primary:has-text("Continue")');
  await expect(continueBtn).toBeEnabled({ timeout: 5000 });
  await continueBtn.click();
  await page.waitForSelector('h2:has-text("Database Configuration")');
}

/**
 * Fill database form with DDEV credentials.
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
 * Fill database form, test connection, and continue to next step.
 * @param {import('@playwright/test').Page} page
 */
async function completeDatabaseStep(page) {
  await fillDatabaseForm(page);
  // Wait for auto-validation or click Test Connection manually
  await page.locator('button:has-text("Test Connection")').click();
  await page.getByText('Success: Database connection').waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('button.btn-primary:has-text("Continue")').click();
}

/**
 * Fill admin account form with valid test data.
 * @param {import('@playwright/test').Page} page
 */
async function fillAdminForm(page) {
  await page.locator('#username').fill('admin');
  await page.locator('#password').fill('SecurePass123!');
  await page.locator('#email').fill('admin@example.com');
}

/**
 * Fill site configuration form.
 * @param {import('@playwright/test').Page} page
 */
async function fillSiteForm(page) {
  await page.locator('#siteName').fill('Test TYPO3 Site');
}

/**
 * Navigate through all steps to reach the Site step (step 5).
 * @param {import('@playwright/test').Page} page
 */
async function navigateToSiteStep(page) {
  await navigateToDatabaseStep(page);
  await completeDatabaseStep(page);
  await page.waitForSelector('h2:has-text("Admin")');
  await fillAdminForm(page);
  await page.locator('button.btn-primary:has-text("Continue")').click();
  await page.waitForSelector('h2:has-text("Site")');
}

test.describe('Step Validation Gates', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/typo3-installer.phar', { waitUntil: 'networkidle' });
  });

  test('admin step incomplete blocks installation', async ({ page }) => {
    // Navigate through packages → requirements → database (with valid test)
    await navigateToDatabaseStep(page);
    await completeDatabaseStep(page);
    await page.waitForSelector('h2:has-text("Admin")');

    // Skip admin form — click Site step indicator directly (index 4, zero-based)
    const stepIndicators = page.locator('.step-indicator');
    await stepIndicators.nth(4).click();
    await page.waitForSelector('h2:has-text("Site")');

    // Fill site form so only admin is incomplete
    await fillSiteForm(page);

    // "Start Installation" button should be disabled
    const startBtn = page.locator('button:has-text("Start Installation")');
    await expect(startBtn).toBeDisabled();
  });

  test('database not tested blocks installation', async ({ page }) => {
    // Navigate through packages → requirements
    await navigateToRequirements(page);
    const continueBtn = page.locator('button.btn-primary:has-text("Continue")');
    await expect(continueBtn).toBeEnabled({ timeout: 5000 });
    await continueBtn.click();
    await page.waitForSelector('h2:has-text("Database Configuration")');

    // Skip database step entirely (don't fill form to avoid auto-validation)
    const stepIndicators = page.locator('.step-indicator');
    await stepIndicators.nth(3).click();
    await page.waitForSelector('h2:has-text("Admin")');

    // Fill admin form and navigate to Site step
    await fillAdminForm(page);
    await stepIndicators.nth(4).click();
    await page.waitForSelector('h2:has-text("Site")');
    await fillSiteForm(page);

    // "Start Installation" button should be disabled
    const startBtn = page.locator('button:has-text("Start Installation")');
    await expect(startBtn).toBeDisabled();
  });

  test('site name empty blocks installation', async ({ page }) => {
    // Navigate through all steps properly
    await navigateToSiteStep(page);

    // Clear the site name field
    await page.locator('#siteName').fill('');

    // "Start Installation" button should be disabled
    const startBtn = page.locator('button:has-text("Start Installation")');
    await expect(startBtn).toBeDisabled();
  });

  test('clicking disabled button does not navigate to install', async ({ page }) => {
    // Navigate through packages → requirements → database (with valid test)
    await navigateToDatabaseStep(page);
    await completeDatabaseStep(page);
    await page.waitForSelector('h2:has-text("Admin")');

    // Skip admin — go directly to Site step
    const stepIndicators = page.locator('.step-indicator');
    await stepIndicators.nth(4).click();
    await page.waitForSelector('h2:has-text("Site")');
    await fillSiteForm(page);

    // Click the disabled "Start Installation" button with force
    const startBtn = page.locator('button:has-text("Start Installation")');
    await startBtn.click({ force: true });

    // Should still be on Site step (not navigated to install)
    await expect(page.locator('h2')).toContainText('Site Configuration');
    // Button should still be disabled
    await expect(startBtn).toBeDisabled();
  });

  test('all steps complete enables Start Installation', async ({ page }) => {
    // Navigate through all steps with valid data
    await navigateToSiteStep(page);
    await fillSiteForm(page);

    // "Start Installation" button should be enabled
    const startBtn = page.locator('button:has-text("Start Installation")');
    await expect(startBtn).toBeEnabled();
  });
});

test.describe('Installation Completion', () => {
  test.setTimeout(300000);

  test('should complete installation with success UI and clear session storage', async ({ page }) => {
    await page.goto('/typo3-installer.phar', { waitUntil: 'networkidle' });

    // Step 1: Packages
    await page.waitForSelector('h2:has-text("Select Packages")');
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Step 2: Requirements
    await page.waitForSelector('h2:has-text("System Requirements")');
    await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Step 3: Database
    await page.waitForSelector('h2:has-text("Database Configuration")');
    await fillDatabaseForm(page);
    await page.locator('button:has-text("Test Connection")').click();
    await page.getByText('Success: Database connection').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Step 4: Admin
    await page.waitForSelector('h2:has-text("Admin")');
    await fillAdminForm(page);
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Step 5: Site
    await page.waitForSelector('h2:has-text("Site")');
    await fillSiteForm(page);
    await page.locator('button:has-text("Start Installation")').click();

    // Step 6: Progress — wait for installation to start
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
    expect(await backendLink.getAttribute('href')).toBeTruthy();
    expect(await backendLink.getAttribute('target')).toBe('_blank');

    // Assert "Go to Frontend" button
    const frontendLink = page.locator('.success-buttons a.btn-outline');
    await expect(frontendLink).toBeVisible();
    await expect(frontendLink).toContainText('Go to Frontend');
    expect(await frontendLink.getAttribute('href')).toBeTruthy();
    expect(await frontendLink.getAttribute('target')).toBe('_blank');

    // Assert progress bar at 100%
    const progressFill = page.locator('.progress-fill');
    await expect(progressFill).toHaveAttribute('style', 'width: 100%');

    // Assert all 6 tasks are completed
    const completedTasks = page.locator('t3-task-list .task.completed');
    await expect(completedTasks).toHaveCount(6);

    // Assert terminal output is still visible
    await expect(page.locator('t3-terminal-output')).toBeVisible();
  });
});

test.describe('Step Indicator States', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/typo3-installer.phar', { waitUntil: 'networkidle' });
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

  test('incomplete steps show incomplete indicator class', async ({ page }) => {
    // Navigate to site step with admin incomplete
    await navigateToDatabaseStep(page);
    await completeDatabaseStep(page);
    await page.waitForSelector('h2:has-text("Admin")');

    // Skip admin — go directly to Site step
    const stepIndicators = page.locator('.step-indicator');
    await stepIndicators.nth(4).click();
    await page.waitForSelector('h2:has-text("Site")');

    // Admin step indicator (index 3) should have .incomplete class since it was visited but not completed
    const adminStepIndicator = stepIndicators.nth(3);
    await expect(adminStepIndicator).toHaveClass(/incomplete/);

    // Completed steps should not have .incomplete class
    const dbStepIndicator = stepIndicators.nth(2);
    await expect(dbStepIndicator).toHaveClass(/completed/);
    await expect(dbStepIndicator).not.toHaveClass(/incomplete/);
  });
});
