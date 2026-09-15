import { test, expect } from '@playwright/test';

for (const timezoneId of ['Europe/Paris', 'Asia/Dubai', 'America/New_York']) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId });
    for (const admin of [true, false]) for (const type of ['blood_test', 'nursing']) {
      test(`${admin ? 'admin' : 'patient'} ${type}: today uses Paris and allows widening the slot`, async ({ page }) => {
        await page.clock.install({ time: new Date('2026-09-15T12:30:00Z') });
        const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
        if (admin) await page.addInitScript(user => {
          localStorage.setItem('auth_token', 'local-ui-fixture');
          localStorage.setItem('auth_user', JSON.stringify(user));
          localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
        }, user);
        await page.route('**/api/**', route => {
          const url = new URL(route.request().url());
          const data = url.pathname.endsWith('/auth/me') ? user : url.pathname === '/api/categories' && !url.searchParams.has('category_options_for')
            ? [{ id: 'fixture-care', name: 'Soin de test', type, icon: 'syringe', options: [], is_active: 1 }] : [];
          return route.fulfill({ json: { success: true, user, data, pagination: { pages: 1 } } });
        });
        await page.goto(admin ? '/admin/appointments/new' : '/rendez-vous/nouveau');
        await page.getByRole('button', { name: 'Configurer et ajouter Soin de test', exact: true }).click();
        const confirm = page.getByRole('button', { name: 'Valider et ajouter', exact: true });
        const cart = page.getByRole('button', { name: /Ouvrir le détail du panier/ });
        await expect(confirm.or(cart).first()).toBeVisible();
        if (await confirm.isVisible()) await confirm.click();
        const next = page.getByRole('button', { name: 'Continuer', exact: true });
        await next.click();
        if (type === 'blood_test') await next.click();
        const dates = page.locator('.booking-date-carousel').first();
        const available = dates.locator('[data-booking-date-scroller] > div:not([inert]) button:not([disabled])');
        await available.first().click();
        await page.getByRole('radio', { name: 'Créneau horaire', exact: true }).click();
        const sliders = page.getByRole('slider');
        await expect(sliders.first()).toHaveAttribute('aria-valuemin', '15');
        await expect(sliders.last()).toHaveAttribute('aria-valuemax', type === 'blood_test' ? '17' : '22');
        await sliders.last().focus();
        await sliders.last().press('End');
        await expect(sliders.last()).toHaveAttribute('aria-valuenow', type === 'blood_test' ? '17' : '22');
        await expect(page.getByText(/Horaires de Paris/)).toBeVisible();
        await available.nth(1).click();
        await expect(sliders.first()).toHaveAttribute('aria-valuemin', '6');
        // A future choice remains valid; today advances automatically when the Paris day closes.
        await available.first().click();
        await page.clock.setSystemTime(new Date('2026-09-15T21:30:00Z'));
        await page.clock.fastForward(60_000);
        await expect(dates.locator('button[aria-pressed="true"]')).toHaveAttribute('aria-label', /16 sept.*2026/);
        await expect(sliders.first()).toHaveAttribute('aria-valuemin', '6');
        await expect(sliders.last()).toHaveAttribute('aria-valuemax', type === 'blood_test' ? '17' : '22');
        await expect(page.getByText('Aucun créneau restant aujourd’hui. Choisissez une autre date.')).toBeHidden();
        await expect(dates.getByRole('button', { name: /15 sept.*2026/ })).toHaveCount(0);
      });
    }
  });
}
