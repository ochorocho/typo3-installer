import { execSync } from 'node:child_process';

export default function globalSetup() {
  console.log('Running TYPO3 reset...');
  execSync('/mnt/ddev_config/commands/web/typo3-test-reset.sh', { stdio: 'inherit' });
}
