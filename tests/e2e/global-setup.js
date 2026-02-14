import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function globalSetup() {
  if (process.env.REMOTE_TEST) {
    const nukeUrl = process.env.NUKE_URL;
    if (nukeUrl) {
      console.log(`Remote test mode — calling nuke URL: ${nukeUrl}`);
      execSync(
        `curl -s -o /dev/null -w "%{http_code}" -u "nuke:Password.1" --connect-timeout 15 --max-time 60 "${nukeUrl}"`,
        { stdio: 'inherit' }
      );
    } else {
      console.log('Remote test mode — no NUKE_URL set, skipping reset');
    }
    return;
  }

  console.log('Running TYPO3 reset...');

  if (process.env.CI) {
    // CI environment: use portable reset script
    const resetScript = resolve(__dirname, '../../scripts/ci/reset-test-installation.sh');
    execSync(`bash "${resetScript}"`, { stdio: 'inherit' });
  } else {
    // Local development: use DDEV command
    execSync('/mnt/ddev_config/commands/web/typo3-test-reset.sh', { stdio: 'inherit' });
  }
}
