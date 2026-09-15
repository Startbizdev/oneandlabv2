import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  test(`admin activity details and API retry at ${width}px`, async ({ page }) => {
    const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
    }, user);
    let unavailable = true;
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
      if (path === '/api/logs') return route.fulfill({ json: unavailable ? { success: false, error: 'Indisponible' } : { success: true, data: [{ id: 'fixture-log', created_at: '2026-09-15 09:00:00', action: 'update', resource_type: 'appointment', resource_id: 'fixture-appointment', user_display: 'Compte fictif', summary: 'Horaire mis à jour', details: { fields: ['scheduled_at'] } }], pagination: { total: 1, pages: 1 } } });
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/admin/logs');
    await expect(page.getByText('Impossible de charger le journal. Réessayez.', { exact: true })).toBeVisible();
    unavailable = false;
    await page.getByRole('button', { name: 'Actualiser', exact: true }).first().click();
    await expect(page.getByText('Horaire mis à jour', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Voir détails', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/scheduled_at/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/admin-activity-${width}.png`, fullPage: true });
  });
}
