import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html'],
    ['junit', { outputFile: process.env.PLAYWRIGHT_JUNIT_OUTPUT_NAME || 'test-results/junit.xml' }]
  ],
  timeout: 60000,
  globalSetup: './global-setup.js',

  use: {
    baseURL: process.env.BASE_URL || 'https://typo3-installer.ddev.site',
    //trace: 'on-first-retry',
    trace: 'on',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,  // Required for DDEV self-signed SSL certificates
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  projects: [
    // ============================================
    // Group 1: UI Tests (can run in parallel)
    // These tests don't depend on database state
    // ============================================
    {
      name: 'ui-desktop',
      testDir: './tests/ui',
      fullyParallel: true,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ui-mobile',
      testDir: './tests/ui',
      testMatch: ['responsive.spec.js'],
      fullyParallel: true,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'ui-tablet',
      testDir: './tests/ui',
      testMatch: ['responsive.spec.js'],
      fullyParallel: true,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        isMobile: false,
        hasTouch: true,
      },
    },

    // ============================================
    // Group 2: API Tests
    // ============================================
    {
      name: 'api',
      testMatch: ['api.spec.js'],
      fullyParallel: true,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api-postgresql',
      testMatch: ['api-postgresql.spec.js'],
      fullyParallel: true,
      use: { ...devices['Desktop Chrome'] },
    },
    // ============================================
    // Group 3: Full Flow Tests (one per database driver)
    // Each project runs its own database installation test
    // Run separately: npx playwright test --project=mysql
    // ============================================
    {
      name: 'mysql',
      testDir: './tests/full-flows',
      testMatch: ['mysql.spec.js'],
      fullyParallel: false,
      workers: 1,
      timeout: 300000, // 5 minutes for full installations
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'postgresql',
      testDir: './tests/full-flows',
      testMatch: ['postgresql.spec.js'],
      fullyParallel: false,
      workers: 1,
      timeout: 300000,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'sqlite',
      testDir: './tests/full-flows',
      testMatch: ['sqlite.spec.js'],
      fullyParallel: false,
      workers: 1,
      timeout: 300000,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // webServer not needed - DDEV is already running
});
