import { test, expect } from '@playwright/test';

test('table component demo is unavailable in the production build', async ({ request }) => {
  const response = await request.get('/admin/test-table');
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('Page de test du composant tableau');
});

const routes = [
  '/pour-les-infirmiers', '/pour-les-laboratoires', '/pour-les-professionnels', '/pour-les-patients',
  '/contact', '/mentions-legales', '/politique-confidentialite', '/cgv',
  '/nurse/register', '/lab/register', '/pro/register', '/patient/register', '/register/merci',
];

for (const width of [360, 1440]) {
  for (const path of routes) {
    test(`public entry ${path} remains usable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 1000 });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => route.fulfill({ json: { success: false, error: 'Service temporairement indisponible' } }));
      await page.goto(path);
      await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__));
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: /^(404|500)$/ })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}
