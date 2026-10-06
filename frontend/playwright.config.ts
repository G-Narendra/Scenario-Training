import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  forbidOnly: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:8000',
        permissions: ['microphone'],
        launchOptions: {
          args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
        },
      },
    },
  ],
  webServer: {
    command: 'powershell -Command ".venv\\Scripts\\Activate.ps1; python scripts/seed.py; uvicorn backend.app.main:app --host 127.0.0.1 --port 8000"',
    cwd: '..',
    url: 'http://127.0.0.1:8000/health',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
