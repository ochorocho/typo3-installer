import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function globalSetup() {
  console.log('Running TYPO3 reset...');

  if (process.env.CI === 'true') {
    // CI environment: use portable reset script
    const resetScript = resolve(__dirname, '../../scripts/ci/reset-test-installation.sh');
    execSync(`bash "${resetScript}"`, { stdio: 'inherit' });
  } else {
    // Local development: use DDEV command
    execSync('/mnt/ddev_config/commands/web/typo3-test-reset.sh', { stdio: 'inherit' });
  }
}
