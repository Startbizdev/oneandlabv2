import { test, expect } from '@playwright/test';

for (const timezoneId of ['Asia/Dubai', 'America/Los_Angeles']) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId });
    for (const width of [360, 1440]) {
      test(`calendar includes the last evening and groups ISO dates in France at ${width}px`, async ({ page }) => {
        await page.clock.install({ time: new Date('2026-10-15T10:00:00Z') });
        await page.setViewportSize({ width, height: 1000 });
        const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
        await page.addInitScript(user => {
          localStorage.setItem('auth_token', 'local-ui-fixture');
          localStorage.setItem('auth_user', JSON.stringify(user));
        }, user);
        const rows = [
          { id: 'fixture-last', scheduled_at: '2026-10-31 23:45:00', first_name: 'Finmois' },
          { id: 'fixture-boundary', scheduled_at: '2026-10-31T23:15:00Z', first_name: 'Novembre' },
        ].map(row => ({ ...row, type: 'blood_test', status: 'confirmed', form_data: { first_name: row.first_name, last_name: 'Exemple' }, address: { label: 'Adresse fictive, Paris' } }));
        await page.route('**/api/**', route => {
          const path = new URL(route.request().url()).pathname;
          const data = path.endsWith('/auth/me') ? user : path === '/api/appointments' ? rows : [];
          return route.fulfill({ json: { success: true, user, data, pagination: { total: 2, page: 1, pages: 1, limit: 250 } } });
        });
        await page.goto('/admin/calendar');
        await page.getByRole('button', { name: 'Liste', exact: true }).click();
        await expect(page.getByText('Finmois Exemple', { exact: true }).filter({ visible: true }).first()).toBeVisible();
        await expect(page.getByText(/23:45/).filter({ visible: true }).first()).toBeVisible();
        await expect(page.getByText('Novembre Exemple', { exact: true }).filter({ visible: true })).toHaveCount(0);
        await page.getByRole('button', { name: 'Suivant', exact: true }).click();
        await expect(page.getByText('Novembre Exemple', { exact: true }).filter({ visible: true }).first()).toBeVisible();
        await expect(page.getByText(/00:15/).filter({ visible: true }).first()).toBeVisible();
        await expect(page.getByText('Adresse fictive, Paris', { exact: true }).filter({ visible: true }).first()).toBeVisible();
        await expect(page.getByText(/"label"/).filter({ visible: true })).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `test-results/calendar-france-${timezoneId.replace('/', '-')}-${width}.png`, fullPage: true });
      });
    }
  });
}
