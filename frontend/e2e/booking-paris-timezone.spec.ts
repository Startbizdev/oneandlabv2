import { test, expect, type Page } from './fixtures/test';
import labBrands from './fixtures/lab-brands.json';
import { apiRoutePattern, gotoWaitingForApi, normalizeApiPathname } from './helpers/api-route';

function categoryForType(type: string) {
  return {
    id: 'fixture-care',
    name: 'Soin de test',
    type,
    icon: 'syringe',
    options: [],
    is_active: 1,
  };
}

async function mockBookingTimezoneApi(page: Page, type: string, user: Record<string, unknown>) {
  await page.route(apiRoutePattern(), route => {
    const url = new URL(route.request().url());
    const path = normalizeApiPathname(route.request().url());
    if (path.endsWith('/auth/me')) {
      return route.fulfill({ json: { success: true, user, data: user } });
    }
    if (path === '/api/categories') {
      const data = url.searchParams.has('category_options_for') ? [] : [categoryForType(type)];
      return route.fulfill({ json: { success: true, data, pagination: { pages: 1 } } });
    }
    if (path.endsWith('/public/lab-brands')) {
      return route.fulfill({ json: { success: true, data: labBrands } });
    }
    return route.fulfill({ json: { success: true, data: [], pagination: { pages: 1 } } });
  });
}

async function addCareAndReachDateStep(page: Page, admin: boolean, type: string) {
  await gotoWaitingForApi(
    page,
    admin ? '/admin/appointments/new' : '/rendez-vous/nouveau',
    (p, m) => m === 'GET' && p === '/api/categories',
  );
  const addCare = page.getByRole('button', { name: 'Configurer et ajouter Soin de test', exact: true });
  await expect(addCare).toBeVisible({ timeout: 20_000 });
  await addCare.click();
  const confirm = page.getByRole('button', { name: 'Valider et ajouter', exact: true });
  const cart = page.getByRole('button', { name: /Ouvrir le détail du panier/ });
  await expect(confirm.or(cart).first()).toBeVisible({ timeout: 15_000 });
  if (await confirm.isVisible()) await confirm.click();
  const next = page.getByRole('button', { name: 'Continuer', exact: true });
  await next.click();
  if (type === 'blood_test') await next.click();
  await expect(page.locator('.booking-date-carousel').first()).toBeVisible({ timeout: 15_000 });
}

for (const timezoneId of ['Europe/Paris', 'Asia/Dubai', 'America/New_York']) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId });
    for (const admin of [true, false]) for (const type of ['blood_test', 'nursing']) {
      test(`${admin ? 'admin' : 'patient'} ${type}: today uses Paris and allows widening the slot`, async ({ page }) => {
        test.setTimeout(90_000);
        await page.clock.install({ time: new Date('2026-09-15T12:30:00Z') });
        const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
        if (admin) {
          await page.addInitScript(u => {
            localStorage.setItem('auth_token', 'local-ui-fixture');
            localStorage.setItem('auth_user', JSON.stringify(u));
            localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
          }, user);
        }
        await mockBookingTimezoneApi(page, type, user);
        await addCareAndReachDateStep(page, admin, type);
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
