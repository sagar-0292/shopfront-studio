import { defineConfig, devices } from '@playwright/test';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANON_KEY } from '../../scripts/local-keys.mjs';

// Test copy of the published kits, plus a pretend motion kit 1.1.0 so the
// compare-and-upgrade flow can be tested. (Real releases are never touched.)
const KITS_FIXTURE = join(__dirname, 'e2e/.kits-fixture');
if (!process.env.E2E_FIXTURE_READY) {
  process.env.E2E_FIXTURE_READY = '1';
  rmSync(KITS_FIXTURE, { recursive: true, force: true });
  cpSync(join(__dirname, 'kits'), KITS_FIXTURE, { recursive: true });
  const src = join(KITS_FIXTURE, 'motion/1.0.0');
  const dst = join(KITS_FIXTURE, 'motion/1.1.0');
  cpSync(src, dst, { recursive: true });
  const js = join(dst, 'sf-motion.js');
  writeFileSync(js, readFileSync(js, 'utf8').replace(/"1\.0\.0"/g, '"1.1.0"'));
  writeFileSync(join(dst, 'VERSION'), '1.1.0\n');
  const mf = JSON.parse(readFileSync(join(KITS_FIXTURE, 'manifest.json'), 'utf8'));
  mf.motion.versions.unshift({ version: '1.1.0', released_at: '2026-10-01', notes: 'Test release: smoother reveals.' });
  mf.motion.latest = '1.1.0';
  writeFileSync(join(KITS_FIXTURE, 'manifest.json'), JSON.stringify(mf, null, 2));
}

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
    // Software WebGL so the 3D objects can be tested without a graphics card.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
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
        KITS_DIR: KITS_FIXTURE,
      },
    },
  ],
});
