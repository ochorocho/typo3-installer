import { test, expect } from '@playwright/test';
import { resetPostgreSQLDatabase, resetTYPO3Installation } from './helpers.js';

const DB_PORT_PGSQL = parseInt(process.env.DB_PORT || process.env.DATABASE_PORT || '5432', 10);

// Reset TYPO3 test environment before running PostgreSQL API tests
test.beforeAll(async () => {
  console.log('Running TYPO3 reset before PostgreSQL API tests...');
  resetPostgreSQLDatabase();
  resetTYPO3Installation();
});

test.describe('API: PostgreSQL Database Connection', () => {
  test('should validate PostgreSQL connection with DDEV credentials', async ({ request }) => {
    const response = await request.post('/typo3-installer.php?route=api/test-database', {
      data: {
        driver: 'pdo_pgsql',
        host: 'postgres',
        port: DB_PORT_PGSQL,
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

  test('should return error for invalid PostgreSQL credentials', async ({ request }) => {
    const response = await request.post('/typo3-installer.php?route=api/test-database', {
      data: {
        driver: 'pdo_pgsql',
        host: 'postgres',
        port: DB_PORT_PGSQL,
        name: 'db',
        user: 'invalid_user',
        password: 'invalid_password'
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toBe(true);
  });
});
