import { defineConfig, devices } from '@playwright/test';
import { liveSpecs } from './e2e/spec-groups';

// Frontend dev (proxy /api → 127.0.0.1:8888) + API PHP réelle + MySQL jetable (docker-compose.e2e-live.yml).
const compose = 'docker compose -f ../docker-compose.e2e-live.yml';

export default defineConfig({
  testDir: './e2e',
  testMatch: liveSpecs,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'html',
  globalTeardown: './e2e/live-teardown.ts',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: `${compose} up --build`,
      url: 'http://127.0.0.1:8888/api/app/version',
      // Jamais réutiliser : un autre process sur 8888 ne serait pas la base jetable
      reuseExistingServer: false,
      timeout: 600_000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
