import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config.js';

// Use one object so defineConfig does not merge the original projects by name.
export default defineConfig({
  ...baseConfig,
  testDir: './tests/agentic',
  testMatch: '**/*.spec.ts',
  retries: 0,
  workers: 1,
  outputDir: 'test-results/agentic',
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report/agentic' }],
    ['json', { outputFile: 'playwright-report/agentic/results.json' }]
  ],
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
