import { execSync } from 'child_process';

export default function globalSetup() {
  console.log('Running TYPO3 reset...');
  execSync('ddev typo3:reset', { stdio: 'inherit' });
}
