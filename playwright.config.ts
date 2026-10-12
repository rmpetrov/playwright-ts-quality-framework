import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'api', testMatch: 'api/**/*.spec.ts' },
    { name: 'chromium', testMatch: 'ui/**/*.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: 'ui/**/*.spec.ts', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: 'ui/**/*.spec.ts', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: [
    {
      command: 'npm run start:api',
      url: 'http://127.0.0.1:3001/health',
      env: { NODE_ENV: 'test', ENABLE_TEST_SUPPORT: 'true' },
      reuseExistingServer: false
    },
    {
      command: 'npm run preview:web',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false
    }
  ]
});
