import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const rootDir = __dirname;
const backDir = path.resolve(rootDir, '../arrowauto-back');

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: {
    timeout: 15000,
  },
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      cwd: backDir,
      port: 3000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
      timeout: 120000,
    },
    {
      command: 'npm run start -- --host 0.0.0.0 --port 4200',
      cwd: rootDir,
      port: 4200,
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
