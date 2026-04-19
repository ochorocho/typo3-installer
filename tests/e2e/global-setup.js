import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function isCommandAvailable(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export default function globalSetup() {
  if (process.env.REMOTE_TEST) {
    const nukeUrl = process.env.NUKE_URL;
    if (nukeUrl) {
      console.log(`Remote test mode — calling nuke URL: ${nukeUrl}`);
      const httpCode = execSync(
        `curl -s -o /dev/null -w "%{http_code}" -u "nuke:Password.1" --connect-timeout 15 --max-time 60 "${nukeUrl}"`,
        { encoding: 'utf8' }
      ).trim();
      console.log(`  nuke HTTP ${httpCode}`);
      if (!/^2\d\d$/.test(httpCode)) {
        throw new Error(
          `Nuke URL ${nukeUrl} returned HTTP ${httpCode} — cannot reset remote server, aborting test.`
        );
      }
    } else {
      console.log('Remote test mode — no NUKE_URL set, skipping reset');
    }
    return;
  }

  console.log('Running TYPO3 reset...');

  // Detect if running inside the DDEV Playwright addon container
  // (has DDEV_SITENAME set but no mysql/database tools available)
  const isPlaywrightContainer = process.env.DDEV_SITENAME && !isCommandAvailable('mysql');

  if (isPlaywrightContainer) {
    // Reset is handled externally (e.g. `ddev typo3:reset` before `ddev playwright test`)
    console.log('Running in Playwright container — skipping reset (run `ddev typo3:reset` before tests)');
  } else if (process.env.CI) {
    // CI environment (non-DDEV): use portable reset script
    const resetScript = resolve(__dirname, '../../scripts/ci/reset-test-installation.sh');
    execSync(`bash "${resetScript}"`, { stdio: 'inherit' });
  } else {
    // Local development inside DDEV web container
    execSync('/mnt/ddev_config/commands/web/typo3-test-reset.sh', { stdio: 'inherit' });
  }
}
