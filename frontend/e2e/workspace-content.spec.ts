import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, role: string) {
  const user = { id: 'fixture-staff', role, first_name: 'Camille', last_name: 'Exemple' };
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [user.role]: true }));
  }, user);
  await page.route('**/api/**', route => route.fulfill({ json: {
    success: true, user, csrf_token: 'fixture', data: route.request().url().includes('/auth/me') ? user : [],
  } }));
}

for (const width of [360, 768, 1440]) {
  test(`admin: populated dashboard at ${width}px`, async ({ page }) => {
    await signIn(page, 'super_admin');
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/admin/stats', route => route.fulfill({ json: { success: true, data: {
      appointmentsByStatus: { total: 1250, pending: 8, confirmed: 20, planned: 5, inProgress: 2, completed: 1215, canceled: 0 },
      usersByRole: { total: 210, patient: 180, nurse: 10, pro: 8, lab: 3, subaccount: 4, preleveur: 4, super_admin: 1 },
      registrationRequestsPending: 3,
      lastAppointments: [{ id: 'fixture-appointment', type: 'blood_test', status: 'confirmed', scheduled_at: '2026-10-15 08:30:00', form_data: { first_name: 'Alexandre', last_name: 'Exemple-Composé', availability: { start: '08:00', end: '10:00' } } }],
      lastUsers: [{ id: 'fixture-user', role: 'nurse', first_name: 'Camille', last_name: 'Exemple', email: 'fixture@example.invalid', created_at: '2026-09-15 09:00:00' }],
      lastActivityLogs: [], lastProfileUpdates: [],
    } } }));
    await page.goto('/admin');
    await expect(page.getByText('Alexandre Exemple-Composé', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Alexandre Exemple-Composé/ })).toHaveAttribute('href', '/admin/appointments/fixture-appointment');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/admin-content-${width}.png`, fullPage: true });
  });
}

test('patients: failed search can retry without claiming the list is empty', async ({ page }) => {
  await signIn(page, 'nurse');
  let failed = true;
  await page.route('**/api/search?**', route => route.fulfill({ json: failed
    ? { success: false, error: 'Fixture unavailable' }
    : { success: true, data: { items: [{ id: 'fixture-patient', patient_id: 'fixture-patient', kind: 'patient', first_name: 'Louise', last_name: 'Exemple', subtitle: 'Suivi à domicile' }] } },
  }));
  await page.goto('/nurse/patients');
  await expect(page.getByText('Impossible de charger vos patients.', { exact: false })).toBeVisible();
  await expect(page.getByText('Votre liste de patients est vide')).toBeHidden();
  failed = false;
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(page.getByText('Louise Exemple', { exact: true })).toBeVisible();
});

test('patients: returning to the previous query finishes loading', async ({ page }) => {
  await signIn(page, 'nurse');
  await page.route('**/api/search?**', route => route.fulfill({ json: { success: true, data: { items: [] } } }));
  await page.goto('/nurse/patients');
  const search = page.getByRole('textbox', { name: 'Rechercher un patient, un document ou un échange' });
  await expect(page.getByText('Votre liste de patients est vide')).toBeVisible();
  await search.fill('Louise');
  await search.fill('');
  await expect(page.getByText('Votre liste de patients est vide')).toBeVisible();
});
