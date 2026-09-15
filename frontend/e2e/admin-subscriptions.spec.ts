import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  test(`subscription follow-up distinguishes actionable accounts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
    }, user);
    let fail = true;
    const rows = [
      { id: 'active', status: 'active' },
      { id: 'canceled', status: 'canceled' },
      { id: 'unpaid', status: 'unpaid' },
      { id: 'trial', status: 'trialing', needs_resync: true, is_trialing: true },
      { id: 'incomplete', status: 'incomplete' },
    ].map(row => ({ ...row, email: `${row.id}@example.invalid`, user_id: row.id, role: 'nurse', plan_slug: 'nurse_pro', billing_source: 'stripe', current_period_end: '2026-10-15' }));
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
      if (path === '/api/admin/subscriptions') return route.fulfill({ json: { success: !fail, data: rows } });
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/admin/abonnements');
    await expect(page.getByRole('heading', { name: 'Abonnements indisponibles', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aucun abonnement', exact: true })).not.toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.locator('article')).toHaveCount(5);
    const attention = page.getByRole('button', { name: /À traiter/ });
    await expect(attention).toContainText('3');
    await attention.click();
    await expect(attention).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('article')).toHaveCount(3);
    await expect(page.getByRole('heading', { name: 'canceled@example.invalid', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'unpaid@example.invalid', exact: true })).toBeVisible();
    await page.getByRole('button', { name: /^Total/ }).click();
    await expect(page.locator('article')).toHaveCount(5);
    await page.getByRole('textbox', { name: 'Rechercher un abonnement', exact: true }).fill('active@');
    await expect(page.locator('article')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
