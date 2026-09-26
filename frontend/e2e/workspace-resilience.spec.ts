import { test, expect } from '@playwright/test';
import { waitForNuxtReady } from './helpers/wait-for-nuxt-ready';

test.describe.configure({ mode: 'serial' });

// Exercise every family of secondary workspace pages against an unavailable API.
// This is an error-state check, separate from the populated workflow tests.
const pages: Record<string, string[]> = {
  super_admin: ['admin/abonnements', 'admin/categories', 'admin/coverage', 'admin/dispatch', 'admin/inscriptions', 'admin/lab-brands', 'admin/logs', 'admin/notifications', 'admin/qr-code', 'admin/reviews', 'admin/users', 'admin/users/new', 'admin/calendar'],
  lab: ['lab/abonnement', 'lab/calendar', 'lab/patients', 'lab/patients/new', 'lab/preleveurs', 'lab/qr-code', 'lab/reviews', 'lab/settings', 'lab/stats', 'lab/subaccounts'],
  nurse: ['nurse/abonnement', 'nurse/calendar', 'nurse/demandes', 'nurse/passage/new', 'nurse/passage/patient-pick', 'nurse/prescriptions', 'nurse/qr-code', 'nurse/resultats', 'nurse/reviews', 'nurse/soins', 'nurse/tournee'],
  pro: ['pro/calendar', 'pro/patients', 'pro/patients/new', 'pro/qr-code', 'pro/prescriptions', 'pro/resultats'],
  subaccount: ['subaccount/calendar', 'subaccount/patients', 'subaccount/preleveurs', 'subaccount/qr-code'],
  preleveur: ['preleveur/calendar', 'preleveur/tournee'],
  patient: ['patient/documents', 'patient/profile', 'patient/relatives', 'patient/resultats', 'patient/reviews'],
};

for (const [role, routes] of Object.entries(pages)) {
  for (const path of routes) {
    test(`unavailable API: /${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 900 });
      const user = { id: 'fixture-user', role, first_name: 'Camille', last_name: 'Exemple', email: 'fixture@example.invalid' };
      await page.addInitScript(user => {
        localStorage.setItem('auth_token', 'local-ui-fixture');
        localStorage.setItem('auth_user', JSON.stringify(user));
        localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [user.role]: true }));
      }, user);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/api/**', route => {
        const auth = route.request().url().includes('/auth/me');
        return route.fulfill({ json: auth ? { success: true, user, data: user } : { success: false, error: 'Service temporairement indisponible' } });
      });
      await page.goto(`/${path}`, { waitUntil: 'domcontentloaded' });
      await waitForNuxtReady(page);
      await expect(page.locator('main').first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      await expect(page.getByText('404', { exact: true })).toBeHidden();
    });
  }
}
