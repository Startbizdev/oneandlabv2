import { test, expect } from '@playwright/test';

for (const fixture of [
  { used: 0, plan: 'discovery', success: true, visible: false },
  { used: 7, plan: 'discovery', success: true, visible: false },
  { used: 8, plan: 'discovery', success: true, visible: true },
  { used: 10, plan: 'discovery', success: true, visible: true },
  { used: 12, plan: 'nurse_pro', success: true, visible: false },
  { used: 8, plan: 'discovery', success: false, visible: false },
]) {
  test(`offer context: ${fixture.plan}, ${fixture.used} accepted, response ${fixture.success}`, async ({ page }) => {
    const user = { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width: 360, height: 900 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
    }, user);
    let loaded = false;
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
      if (path.endsWith('/plan-limits')) {
        await route.fulfill({ json: { success: fixture.success, data: { plan_slug: fixture.plan, appointments_count_this_month: fixture.used, max_appointments_per_month: fixture.plan === 'discovery' ? 10 : null } } });
        loaded = true;
        return;
      }
      return route.fulfill({ json: { success: true, data: [], pagination: { pages: 1 } } });
    });
    await page.goto('/nurse/appointments');
    await expect.poll(() => loaded).toBe(true);
    const banner = page.getByRole('complementary', { name: 'Votre offre', exact: true });
    if (fixture.visible) {
      await expect(banner).toContainText(`${fixture.used}/10 rendez-vous acceptés`);
      await expect(banner.getByRole('link', { name: 'Comparer les offres' })).toHaveAttribute('href', '/nurse/abonnement');
    } else {
      await expect(banner).toHaveCount(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
