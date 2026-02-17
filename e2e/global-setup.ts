import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

async function globalSetup(_config: FullConfig) {
  const backDir = path.resolve(__dirname, '../../arrowauto-back');
  execSync('npm run seed', {
    cwd: backDir,
    stdio: 'inherit',
  });
}

export default globalSetup;
