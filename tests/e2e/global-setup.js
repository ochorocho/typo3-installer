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
      // Try up to 2x — some shared hosts have a cold-start delay or
      // intermittent reverse-proxy timeouts on the first hit. `|| echo`
      // ensures a curl exit (e.g. 28 = timeout) doesn't crash this script;
      // we then check the captured HTTP code and decide.
      const callNuke = () => execSync(
        `curl -s -o /dev/null -w "%{http_code}" -u "nuke:Password.1" --connect-timeout 15 --max-time 90 "${nukeUrl}" || echo "000"`,
        { encoding: 'utf8' }
      ).trim();
      let httpCode = callNuke();
      if (!/^2\d\d$/.test(httpCode)) {
        console.log(`  nuke HTTP ${httpCode} — retrying once`);
        httpCode = callNuke();
      }
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
