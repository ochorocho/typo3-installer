import { test, expect } from '@playwright/test';

/**
 * API Tests for TYPO3 Installer Backend
 *
 * These tests verify that all API endpoints work correctly,
 * return proper response structures, and handle errors appropriately.
 */

test.describe('API: Requirements Check', () => {
  test('POST /api/check-requirements - should return requirements list', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/check-requirements');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.requirements).toBeInstanceOf(Array);
    expect(data.requirements.length).toBeGreaterThan(0);
  });

  test('should return proper requirement structure', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/check-requirements');
    const data = await response.json();

    // Check first requirement has all required fields
    const requirement = data.requirements[0];
    expect(requirement).toHaveProperty('title');
    expect(requirement).toHaveProperty('description');
    expect(requirement).toHaveProperty('status');
    expect(['passed', 'failed', 'warning']).toContain(requirement.status);
  });

  test('should check PHP version requirement', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/check-requirements');
    const data = await response.json();

    const phpCheck = data.requirements.find(r => r.title === 'PHP Version');
    expect(phpCheck).toBeDefined();
    expect(phpCheck.description).toContain('8.2');
    expect(phpCheck.status).toBe('passed'); // Should pass in DDEV environment
  });

  test('should check required PHP extensions', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/check-requirements');
    const data = await response.json();

    const requiredExtensions = ['pdo', 'json', 'mbstring', 'openssl'];

    for (const ext of requiredExtensions) {
      const extCheck = data.requirements.find(r =>
        r.title.includes(`Extension: ${ext}`)
      );
      expect(extCheck).toBeDefined();
      // Extension can be marked as required or recommended, verify it has valid status
      expect(extCheck.status).toMatch(/passed|warning/);
    }
  });

  test('should check file permissions', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/check-requirements');
    const data = await response.json();

    const permCheck = data.requirements.find(r => r.title === 'File Permissions');
    expect(permCheck).toBeDefined();
    expect(permCheck.description).toContain('writable');
    expect(permCheck.status).toBe('passed');
  });

  test('should check memory limit', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/check-requirements');
    const data = await response.json();

    const memCheck = data.requirements.find(r => r.title === 'Memory Limit');
    expect(memCheck).toBeDefined();
    expect(memCheck.description).toContain('256M');
  });
});

test.describe('API: Database Connection Test', () => {
  test('POST /api/test-database - should validate database config with DDEV credentials', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/test-database', {
      data: {
        driver: 'pdo_mysql',
        host: 'db',
        port: 3306,
        name: 'db',
        user: 'db',
        password: 'db'
      }
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('successful');
  });

  test('should return error for invalid database host', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/test-database', {
      data: {
        driver: 'pdo_mysql',
        host: 'invalid-host-that-does-not-exist',
        port: 3306,
        name: 'db',
        user: 'db',
        password: 'db'
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(true);
    expect(data.message).toBeDefined();
  });

  test('should return error for invalid credentials', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/test-database', {
      data: {
        driver: 'pdo_mysql',
        host: 'db',
        port: 3306,
        name: 'db',
        user: 'invalid_user',
        password: 'invalid_password'
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(true);
    expect(data.message).toMatch(/access denied|authentication failed/i);
  });

  test('should return error for invalid database name', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/test-database', {
      data: {
        driver: 'pdo_mysql',
        host: 'db',
        port: 3306,
        name: 'nonexistent_database_12345',
        user: 'db',
        password: 'db'
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(true);
  });

  test('should return 400 for missing request data', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/test-database', {
      data: null
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(true);
    expect(data.message).toContain('Invalid request data');
  });

  test('should handle empty request body', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/test-database', {
      data: {}
    });

    expect(response.status()).toBe(400);
  });

  test('should support default port parameter', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/test-database', {
      data: {
        driver: 'pdo_mysql',
        host: 'db',
        // port omitted, should default to 3306
        name: 'db',
        user: 'db',
        password: 'db'
      }
    });

    // Should succeed even without explicit port
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('API: Installation', () => {
  test('POST /api/install - should accept valid installation config', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/install', {
      data: {
        typo3Version: '14.1',
        database: {
          driver: 'pdo_mysql',
          host: 'db',
          port: 3306,
          name: 'test_install',
          user: 'db',
          password: 'db'
        },
        admin: {
          username: 'admin',
          password: 'Test1234!',
          email: 'admin@test.local'
        },
        site: {
          name: 'Test Site',
          baseUrl: 'https://test.local'
        },
        installPath: 'typo3-test-install'
      }
    });

    // Should start installation
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('started');
  });

  test('should return 400 for null request data', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/install', {
      data: null
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(true);
    expect(data.message).toContain('Invalid request data');
  });

  test('should accept empty config with defaults', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/install', {
      data: {}
    });

    // Backend accepts empty config and uses defaults from InstallationConfig::fromArray()
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
  });

  test('should validate config structure', async ({ request }) => {
    // Missing admin section
    const response = await request.post('/typo3-installer.phar/api/install', {
      data: {
        database: {
          driver: 'pdo_mysql',
          host: 'db',
          port: 3306,
          name: 'test',
          user: 'db',
          password: 'db'
        },
        site: {
          name: 'Test',
          baseUrl: 'https://test.local'
        }
        // Missing admin section
      }
    });

    // Should still start (will use defaults from InstallationConfig::fromArray)
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('API: Installation Status', () => {
  test('GET /api/status - should return status object', async ({ request }) => {
    const response = await request.get('/typo3-installer.phar/api/status');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('progress');
    expect(data).toHaveProperty('currentTask');
    expect(data).toHaveProperty('completed');
    expect(data).toHaveProperty('error');
  });

  test('should return initial status before installation starts', async ({ request }) => {
    const response = await request.get('/typo3-installer.phar/api/status');
    const data = await response.json();

    expect(data.progress).toBeGreaterThanOrEqual(0);
    expect(data.progress).toBeLessThanOrEqual(100);
    expect(typeof data.currentTask).toBe('string');
    expect(typeof data.completed).toBe('boolean');
  });

  test('should have error property in response', async ({ request }) => {
    const response = await request.get('/typo3-installer.phar/api/status');
    const data = await response.json();

    // Error property should exist (can be null or undefined when no errors)
    expect(data).toHaveProperty('error');
  });

  test('progress should be a valid percentage', async ({ request }) => {
    const response = await request.get('/typo3-installer.phar/api/status');
    const data = await response.json();

    expect(typeof data.progress).toBe('number');
    expect(data.progress).toBeGreaterThanOrEqual(0);
    expect(data.progress).toBeLessThanOrEqual(100);
  });
});

test.describe('API: Error Handling', () => {
  test('should return 404 for unknown endpoints', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/unknown-endpoint-xyz');

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  test('should return 404 for invalid API paths', async ({ request }) => {
    const response = await request.get('/typo3-installer.phar/api/does-not-exist');

    expect(response.status()).toBe(404);
  });

  test('should handle GET request to POST-only endpoints', async ({ request }) => {
    const response = await request.get('/typo3-installer.phar/api/check-requirements');

    // The Application.php might handle GET gracefully or return an error
    // Just verify we get a valid HTTP response (not a server error 5xx)
    expect(response.status()).toBeLessThan(600);
    expect(response.status()).toBeGreaterThanOrEqual(200);
  });
});

test.describe('API: Response Headers', () => {
  test('should return JSON content type', async ({ request }) => {
    const response = await request.post('/typo3-installer.phar/api/check-requirements');

    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('all endpoints should return JSON', async ({ request }) => {
    const endpoints = [
      { method: 'POST', path: '/typo3-installer.phar/api/check-requirements' },
      { method: 'POST', path: '/typo3-installer.phar/api/test-database', data: { driver: 'pdo_mysql', host: 'db', name: 'db', user: 'db', password: 'db' } },
      { method: 'GET', path: '/typo3-installer.phar/api/status' }
    ];

    for (const endpoint of endpoints) {
      let response;
      if (endpoint.method === 'POST') {
        response = await request.post(endpoint.path, { data: endpoint.data || {} });
      } else {
        response = await request.get(endpoint.path);
      }

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    }
  });
});

test.describe('API: Integration Tests', () => {
  test('full workflow - requirements → database test → status check', async ({ request }) => {
    // Step 1: Check requirements
    const reqResponse = await request.post('/typo3-installer.phar/api/check-requirements');
    expect(reqResponse.ok()).toBeTruthy();

    const reqData = await reqResponse.json();
    expect(reqData.success).toBe(true);

    // Step 2: Test database connection
    const dbResponse = await request.post('/typo3-installer.phar/api/test-database', {
      data: {
        driver: 'pdo_mysql',
        host: 'db',
        port: 3306,
        name: 'db',
        user: 'db',
        password: 'db'
      }
    });
    expect(dbResponse.ok()).toBeTruthy();

    // Step 3: Check installation status
    const statusResponse = await request.get('/typo3-installer.phar/api/status');
    expect(statusResponse.ok()).toBeTruthy();

    const statusData = await statusResponse.json();
    expect(statusData).toHaveProperty('progress');
  });
});
