import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30000,
  globalSetup: './global-setup.ts',

  use: {
    baseURL: 'https://typo3-installer.ddev.site',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,  // Required for DDEV self-signed SSL certificates
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // command: 'cd ../.. && ddev start',
    // url: 'https://typo3-installer.ddev.site',
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
  },
});
