import { defineConfig, devices } from '@playwright/test';
import { ssrSpecs } from './e2e/spec-groups';

// Build de production + API publique synthétique (e2e/fixtures/public-api-server.cjs) pour le rendu serveur.
const port = 3217;
process.env.PLAYWRIGHT_BASE_URL ||= `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: ssrSpecs,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'node e2e/fixtures/public-api-server.cjs',
      port: 8889,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx nuxt build && node .output-e2e/server/index.mjs',
      url: `http://localhost:${port}`,
      // Jamais réutiliser : un autre process sur ce port fausserait tous les tests SSR
      reuseExistingServer: false,
      timeout: 600_000,
      env: {
        NUXT_BUILD_DIR: '.nuxt-e2e',
        NUXT_OUTPUT_DIR: '.output-e2e',
        NUXT_API_INTERNAL_BASE: 'http://127.0.0.1:8889/api',
        NUXT_PUBLIC_API_BASE: '/api',
        PORT: String(port),
      },
    },
  ],
});
