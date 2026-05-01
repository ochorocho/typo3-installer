import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // 1 retry on every test invocation. The full-flow tests run against shared
  // hosts whose tail latency on cold caches is genuinely stochastic — a
  // retry costs at most one extra run on a host that's having a slow
  // moment, and saves us from chasing flakes that would otherwise require
  // ever-larger timeouts to absorb.
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
    // open: 'never' — the html reporter otherwise tries to launch a browser
    // to view the report on test completion, which hangs indefinitely inside
    // the DDEV playwright container (no DISPLAY) and blocks playwright-remote
    // between hosts. The PLAYWRIGHT_HTML_OPEN env var alone isn't always
    // respected, so set it explicitly here.
    ['html', { open: 'never' }],
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
      // The installer's API enforces strict same-origin on state-changing
      // requests; mirror what a real browser sends so tests using
      // `request.post(...)` aren't rejected as cross-origin.
      'Origin': process.env.BASE_URL || 'https://typo3-installer.ddev.site',
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
      // 10 minutes for full installations. Some shared hosts (notably
      // knallimall.org) take 3–4 minutes for `typo3 setup` + asset
      // publishing on cold caches; 5 min was too tight and produced
      // false failures with the install still actively progressing.
      timeout: 900000,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'postgresql',
      testDir: './tests/full-flows',
      testMatch: ['postgresql.spec.js'],
      fullyParallel: false,
      workers: 1,
      timeout: 900000,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'sqlite',
      testDir: './tests/full-flows',
      testMatch: ['sqlite.spec.js'],
      fullyParallel: false,
      workers: 1,
      timeout: 900000,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // webServer not needed - DDEV is already running
});
