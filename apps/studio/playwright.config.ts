import { defineConfig, devices } from '@playwright/test';
import { ANON_KEY } from '../../scripts/local-keys.mjs';

// End-to-end tests run the real app against the real login server and a
// fresh local database (shopfront_e2e). Emails are captured locally.
const PORT = 3100;
// The app connects with its limited login; test set-up uses the admin login.
const DB = 'postgres://shopfront_app:app-local-only@127.0.0.1:5432/shopfront_e2e';
process.env.E2E_DATABASE_URL = 'postgres://postgres:postgres@127.0.0.1:5432/shopfront_e2e';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `node ../../scripts/local-stack.mjs --db shopfront_e2e --site http://localhost:${PORT}`,
      url: 'http://127.0.0.1:54321/health',
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'ignore',
    },
    {
      command: `pnpm next build && pnpm next start -p ${PORT}`,
      url: `http://localhost:${PORT}/login`,
      reuseExistingServer: false,
      timeout: 300_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON_KEY,
        DATABASE_URL: DB,
        NEXT_PUBLIC_APP_URL: `http://localhost:${PORT}`,
      },
    },
  ],
});
