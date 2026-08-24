import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend env (DASHBOARD_API_KEY, etc.) so the reporter can authenticate.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const API_PORT = 3002;
const UI_PORT = 5173;
const API_URL = process.env.API_BASE_URL || `http://localhost:${API_PORT}`;
const UI_URL = process.env.UI_BASE_URL || `http://localhost:${UI_PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    [
      '../reporter/index.js',
      {
        url: process.env.DASHBOARD_URL || `http://localhost:${API_PORT}/api`,
        apiKey: process.env.DASHBOARD_API_KEY,
        buildName: process.env.DASHBOARD_BUILD_NAME,
        projectName: process.env.DASHBOARD_PROJECT,
      },
    ],
  ],
  use: {
    baseURL: UI_URL,
    actionTimeout: 20_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testMatch: /api\.spec\.ts$/,
      use: { baseURL: API_URL },
    },
    {
      name: 'ui-chromium',
      testMatch: /ui\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], baseURL: UI_URL },
    },
  ],
  webServer: [
    {
      command: 'NODE_ENV=test node src/server.js',
      cwd: '.',
      url: `http://localhost:${API_PORT}/api`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx vite',
      cwd: '../frontend',
      url: `http://localhost:${UI_PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
  globalSetup: './e2e/global-setup',
  globalTeardown: './e2e/global-teardown',
});
