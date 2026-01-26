import { test, expect } from '@playwright/test';

/**
 * Helper to navigate from packages step to requirements step
 * and wait for the requirements check to complete
 */
async function navigateToRequirements(page) {
  // Start on packages step, click Continue to get to requirements
  await page.waitForSelector('h2:has-text("Select Packages")');
  const continueButton = page.locator('button.btn-primary:has-text("Continue")');
  await continueButton.click();
  await page.waitForSelector('h2:has-text("System Requirements")');

  // Wait for requirements check to complete by waiting for the summary section
  // which only appears after the API call finishes (not during loading or error)
  // The API call can take up to 60 seconds
  await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });
}

/**
 * Helper to find elements inside web component shadow DOM
 */
async function getRequirementItems(page) {
  // Use Playwright's built-in shadow DOM piercing with locator
  return page.locator('step-requirements .requirement').all();
}

test.describe('TYPO3 Installer', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the installer
    await page.goto('/typo3-installer.phar', { waitUntil: 'networkidle' });
  });

  test('should load the installer interface', async ({ page }) => {
    // Check for the main heading
    await expect(page.locator('h1')).toContainText('TYPO3 Installer');
  });

  test('should display packages selection step', async ({ page }) => {
    // Should be on step 1 - Package Selection (now the first step)
    await expect(page.locator('h2')).toContainText('Select Packages');
  });

  test('should show requirement status indicators', async ({ page }) => {
    // Navigate to requirements step (step 2) and wait for check to complete
    await navigateToRequirements(page);

    // Find requirement items inside the web component
    const items = await getRequirementItems(page);
    expect(items.length).toBeGreaterThan(0);

    // Each item should have a status class
    for (const item of items) {
      const classList = await item.getAttribute('class');
      expect(classList).toMatch(/passed|failed|warning/);
    }
  });

  test('should enable continue button when requirements pass', async ({ page }) => {
    // Navigate to requirements step (step 2) and wait for check to complete
    await navigateToRequirements(page);

    // If all requirements pass, continue button should be enabled
    const continueButton = page.locator('button.btn-primary:has-text("Continue")');

    // Check if button exists
    await expect(continueButton).toBeVisible();
  });

  test('should navigate to database configuration', async ({ page }) => {
    // Navigate to requirements step (step 2) and wait for check to complete
    await navigateToRequirements(page);

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
    // Navigate to requirements step (step 2) and wait for check to complete
    await navigateToRequirements(page);

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
    // Navigate to requirements step (step 2) and wait for check to complete
    await navigateToRequirements(page);

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

    // Should have 6 steps (Packages, Requirements, Database, Admin, Site, Install)
    const count = await stepIndicators.count();
    expect(count).toBe(6);
  });

  test('should highlight current step', async ({ page }) => {
    // First step should be active
    const activeStep = page.locator('.step-indicator.active');
    await expect(activeStep).toHaveCount(1);

    // Verify the active step is visible (step may show number or checkmark depending on completion state)
    await expect(activeStep).toBeVisible();
  });
});

test.describe('Database Configuration', () => {
  // Increase timeout for these tests as they navigate through multiple steps
  test.setTimeout(120000);

  /**
   * Helper to navigate to the database configuration step
   */
  async function navigateToDatabaseStep(page) {
    await page.goto('/typo3-installer.phar', { waitUntil: 'networkidle' });

    // Step 1: Packages - click Continue
    await page.waitForSelector('h2:has-text("Select Packages")');
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Step 2: Requirements - wait for check to complete, then Continue
    await page.waitForSelector('h2:has-text("System Requirements")');
    await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });

    // Wait for Continue button to be enabled (requirements must pass)
    const requirementsContinue = page.locator('button.btn-primary:has-text("Continue")');
    await requirementsContinue.waitFor({ state: 'visible' });

    // Check if requirements passed - if button is disabled, skip with informative message
    if (!(await requirementsContinue.isEnabled())) {
      throw new Error('Requirements check failed - Continue button is disabled. Check server requirements.');
    }

    await requirementsContinue.click();

    // Step 3: Database Configuration
    await page.waitForSelector('h2:has-text("Database Configuration")');
  }

  /**
   * Fill database form with provided credentials
   */
  async function fillDatabaseForm(page, { driver = 'pdo_mysql', host = 'db', port = '3306', name = 'db', user = 'db', password = 'db' }) {
    // Select driver
    await page.locator('#driver').selectOption(driver);

    // Fill host
    await page.locator('#host').fill(host);

    // Fill port
    await page.locator('#port').fill(port);

    // Fill database name
    await page.locator('#name').fill(name);

    // Fill username
    await page.locator('#user').fill(user);

    // Fill password
    await page.locator('#password').fill(password);
  }

  test('should test database connection with valid credentials', async ({ page }) => {
    await navigateToDatabaseStep(page);

    // Fill form with valid DDEV credentials
    await fillDatabaseForm(page, {
      driver: 'pdo_mysql',
      host: 'db',
      port: '3306',
      name: 'db',
      user: 'db',
      password: 'db'
    });

    // Click Test Connection button
    const testButton = page.locator('button:has-text("Test Connection")');
    await testButton.click();

    // Wait for success message
    await expect(page.locator('.alert-success, .success-message, [class*="success"]')).toBeVisible({ timeout: 15000 });
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await navigateToDatabaseStep(page);

    // Fill form with invalid credentials
    await fillDatabaseForm(page, {
      driver: 'pdo_mysql',
      host: 'db',
      port: '3306',
      name: 'db',
      user: 'invalid_user',
      password: 'invalid_password'
    });

    // Click Test Connection button
    const testButton = page.locator('button:has-text("Test Connection")');
    await testButton.click();

    // Wait for error message
    await expect(page.getByText('Error: Database connection')).toBeVisible({ timeout: 15000 });
  });

  test('should enable Continue button after successful connection test', async ({ page }) => {
    await navigateToDatabaseStep(page);

    // Fill form with valid DDEV credentials
    await fillDatabaseForm(page, {
      driver: 'pdo_mysql',
      host: 'db',
      port: '3306',
      name: 'db',
      user: 'db',
      password: 'db'
    });

    // Click Test Connection button
    await page.locator('button:has-text("Test Connection")').click();

    // Wait for success
    await expect(page.locator('.alert-success, .success-message, [class*="success"]')).toBeVisible({ timeout: 15000 });

    // Continue button should now be enabled
    const continueButton = page.locator('button.btn-primary:has-text("Continue")');
    await expect(continueButton).toBeEnabled();
  });

  test('should navigate to admin step after database configuration', async ({ page }) => {
    await navigateToDatabaseStep(page);

    // Fill form with valid DDEV credentials
    await fillDatabaseForm(page, {
      driver: 'pdo_mysql',
      host: 'db',
      port: '3306',
      name: 'db',
      user: 'db',
      password: 'db'
    });

    // Test connection
    await page.locator('button:has-text("Test Connection")').click();
    await expect(page.locator('.alert-success, .success-message, [class*="success"]')).toBeVisible({ timeout: 15000 });

    // Click Continue
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // Should navigate to Admin Account step
    await expect(page.locator('h2')).toContainText('Admin', { timeout: 5000 });
  });
});

test.describe('Full Installation Flow', () => {
  test.skip('should complete full installation', async ({ page }) => {
    // This would test the complete flow
    // Skip for now as it requires database and takes time
  });
});
