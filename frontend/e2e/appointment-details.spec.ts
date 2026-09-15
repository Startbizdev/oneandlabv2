import { test, expect } from '@playwright/test';
test.describe.configure({ mode: 'parallel' });

for (const role of ['super_admin', 'lab', 'subaccount', 'pro', 'patient', 'nurse', 'preleveur']) {
  for (const width of [360, 1440]) {
    test(`${role}: populated appointment detail at ${width}px`, async ({ page }) => {
      const user = { id: 'fixture-staff', role, first_name: 'Camille', last_name: 'Exemple', email: 'fixture@example.invalid' };
      await page.addInitScript(user => {
        localStorage.setItem('auth_token', 'local-ui-fixture');
        localStorage.setItem('auth_user', JSON.stringify(user));
        localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [user.role]: true }));
      }, user);
      const appointment = {
        id: 'fixture-appointment', patient_id: role === 'patient' ? user.id : 'fixture-patient',
        type: role === 'nurse' ? 'nursing' : 'blood_test', form_type: role === 'nurse' ? 'nursing' : 'blood_test',
        status: 'confirmed', scheduled_at: '2026-10-15 08:30:00', created_at: '2026-09-15 09:00:00',
        assigned_nurse_id: role === 'nurse' ? user.id : null, assigned_lab_id: ['lab', 'subaccount'].includes(role) ? user.id : 'fixture-lab', assigned_to: role === 'preleveur' ? user.id : null,
        address: '10 rue Exemple, 75001 Paris', category_name: 'Soin de suivi', category_id: 'fixture-care', category_image_url: '/api/old-care.png',
        form_data: { first_name: 'Louise', last_name: 'Exemple', email: 'fixture@example.invalid', phone: '0100000000', birth_date: '1990-01-01', gender: 'female', duration_days: '7', frequency: 'once_daily', availability: { type: 'custom', range: [8, 10] }, address: { label: '10 rue Exemple, 75001 Paris', lat: 48.86, lng: 2.34 } },
      };
      await page.setViewportSize({ width, height: 1000 });
      await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/categories') return route.fulfill({ json: { success: true, data: [{ id: 'fixture-care', name: 'Soin de suivi', type: appointment.type, icon: 'syringe', image_url: '/api/old-care.png' }] } });
        if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
        if (path === '/api/appointments/fixture-appointment') return route.fulfill({ json: { success: true, data: appointment } });
        if (path === '/api/medical-documents') return route.fulfill({ json: { success: true, data: [{ id: 'fixture-document', document_type: 'ordonnance', file_name: 'Ordonnance-fictive.pdf', file_size: 1024, mime_type: 'application/pdf', created_at: '2026-09-15 09:00:00' }] } });
        return route.fulfill({ json: { success: true, data: [] } });
      });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`/${role === 'super_admin' ? 'admin' : role}/appointments/fixture-appointment`);
      await expect(page.getByRole('link', { name: 'Retour à la liste', exact: true })).toBeVisible();
      await expect(page.getByText(role === 'patient' ? 'Soin de suivi' : /Louise/).first()).toBeVisible();
      await expect(page.getByText('Rendez-vous introuvable', { exact: true })).toBeHidden();
      if (role === 'lab' && width === 360) {
        const actions = page.getByRole('button', { name: 'Actions et affectation', exact: true });
        await expect(actions).toHaveAttribute('aria-expanded', 'false');
        await actions.click();
        await expect(page.getByRole('button', { name: 'Appliquer l’assignation', exact: true })).toBeVisible();
        await actions.click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('[class*="syringe"]').first()).toBeVisible();
      await expect(page.locator('img[src="/api/old-care.png"]')).toHaveCount(0);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `test-results/appointment-detail-${role}-${width}.png`, fullPage: true });
    });
  }
}
