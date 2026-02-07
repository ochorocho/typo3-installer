import { test, expect } from '@playwright/test';
import {
  checkAccessibility,
  fillMySQLForm,
  fillAdminForm,
  fillSiteForm
} from '../helpers.js';

/**
 * MySQL Full Installation Flow
 *
 * Tests complete TYPO3 installation with MySQL database.
 * Includes WCAG 2.2 accessibility checks at each step (logged, not blocking).
 *
 * Prerequisites:
 * - DDEV environment running with MySQL container
 * - Empty database (global-setup.js handles reset)
 */
test.describe.serial('MySQL Full Installation Flow', () => {
  test.setTimeout(300000); // 5 minutes for full installation

  // Accessibility checks log violations but don't fail tests
  // This allows installation flow to complete while tracking a11y issues
  const a11yOptions = { failOnViolation: false };

  test('complete installation with MySQL and WCAG checks', async ({ page }) => {
    await page.goto('/typo3-installer.phar', { waitUntil: 'networkidle' });

    // ============================================
    // Step 1: Packages Selection
    // ============================================
    await page.waitForSelector('h2:has-text("Select Packages")');
    await expect(page.locator('h2')).toContainText('Select Packages');
    await checkAccessibility(page, 'Step 1: Packages', a11yOptions);
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // ============================================
    // Step 2: System Requirements
    // ============================================
    await page.waitForSelector('h2:has-text("System Requirements")');
    await page.locator('.summary').waitFor({ state: 'visible', timeout: 65000 });
    await checkAccessibility(page, 'Step 2: Requirements', a11yOptions);

    // Verify requirements passed
    const requirementsContinue = page.locator('button.btn-primary:has-text("Continue")');
    await expect(requirementsContinue).toBeEnabled({ timeout: 5000 });
    await requirementsContinue.click();

    // ============================================
    // Step 3: Database Configuration (MySQL)
    // ============================================
    await page.waitForSelector('h2:has-text("Database Configuration")');
    await fillMySQLForm(page);

    // Wait for auto-validation to complete (shows success alert)
    await page.locator('.alert-success').waitFor({ state: 'visible', timeout: 15000 });
    await checkAccessibility(page, 'Step 3: Database', a11yOptions);
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // ============================================
    // Step 4: Admin Account
    // ============================================
    await page.waitForSelector('h2:has-text("Admin")');
    await fillAdminForm(page);
    await checkAccessibility(page, 'Step 4: Admin', a11yOptions);
    await page.locator('button.btn-primary:has-text("Continue")').click();

    // ============================================
    // Step 5: Site Configuration
    // ============================================
    await page.waitForSelector('h2:has-text("Site")');
    await fillSiteForm(page);
    await checkAccessibility(page, 'Step 5: Site', a11yOptions);
    await page.locator('button:has-text("Start Installation")').click();

    // ============================================
    // Step 6: Installation Progress
    // ============================================
    await page.waitForSelector('h2:has-text("Installing TYPO3")');
    await checkAccessibility(page, 'Step 6: Progress', a11yOptions);

    // Wait for installation to complete (up to 3 minutes)
    await page.locator('.success-message h3:has-text("Installation Complete!")')
      .waitFor({ state: 'visible', timeout: 180000 });
    await checkAccessibility(page, 'Step 6: Success', a11yOptions);

    // ============================================
    // Verify Success State
    // ============================================
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

    // ============================================
    // Theme Toggle Test: Dark Mode
    // ============================================
    const darkModeButton = page.locator('t3-theme-toggle .theme-btn[title="Dark mode"]');
    if (await darkModeButton.isVisible()) {
      await darkModeButton.click();
      await page.waitForTimeout(500);
      await checkAccessibility(page, 'Dark Mode', a11yOptions);

      // Switch back to light mode for cleanup
      const lightModeButton = page.locator('t3-theme-toggle .theme-btn[title="Light mode"]');
      if (await lightModeButton.isVisible()) {
        await lightModeButton.click();
        await page.waitForTimeout(500);
      }
    }
  });
});
