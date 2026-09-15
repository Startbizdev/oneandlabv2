import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  test(`booking calendar: usable paging and selected date retained at ${width}px`, async ({ page }) => {
    const user = { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
    }, user);
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => route.fulfill({ json: {
      success: true, user, data: route.request().url().includes('/auth/me') ? user : [],
    } }));
    await page.goto('/nurse/appointments/new');
    await page.getByRole('button', { name: 'Configurer et ajouter Prélèvement', exact: true }).click();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Choix du laboratoire' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    const calendar = page.locator('.booking-date-carousel').first();
    for (const name of ['Retour', 'Continuer']) {
      const button = page.getByRole('button', { name, exact: true }).filter({ visible: true }).last();
      await expect(button).toBeVisible();
      const box = (await button.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    const available = calendar.locator('[data-booking-date-scroller] > div:not([inert]) button:not([disabled])');
    await expect(available.first()).toBeVisible();
    const chosen = available.nth(1);
    const label = await chosen.getAttribute('aria-label');
    await chosen.click();
    await expect(chosen).toHaveAttribute('aria-pressed', 'true');
    const next = calendar.getByRole('button', { name: 'Période suivante', exact: true });
    expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await next.click();
    await expect(calendar.getByRole('button', { name: label!, exact: true })).toHaveCount(0);
    await calendar.getByRole('button', { name: 'Période précédente', exact: true }).click();
    await expect.poll(() => calendar.locator('[data-booking-date-scroller]').evaluate(el => el.scrollLeft)).toBeLessThan(1);
    await expect(calendar.getByRole('button', { name: label!, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(calendar.locator('[data-booking-date-scroller] > div:not([inert]) button')).toHaveCount(width < 640 ? 10 : 14);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/booking-calendar-${width}.png`, fullPage: true });
  });
}
