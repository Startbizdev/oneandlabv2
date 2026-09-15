import { test, expect } from '@playwright/test';
test.use({ timezoneId: 'Asia/Dubai' });

for (const failure of ['save', 'document']) {
test(`admin edit retains legacy data; failed ${failure} stays retryable`, async ({ page }) => {
  const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
  const categoryId = '11111111-1111-4111-8111-111111111111';
  const appointment = {
    id: 'fixture-edit', type: 'nursing', form_type: 'nursing', status: 'confirmed', patient_id: 'fixture-patient',
    category_id: categoryId, scheduled_at: '2027-10-15 08:00:00', address: '10 rue Exemple, 75001 Paris',
    location_lat: 48.86, location_lng: 2.34,
    form_data: { first_name: 'Louise', last_name: 'Exemple', email: 'fixture@example.invalid', phone: '0612345678', birth_date: '1990-01-01', gender: 'female',
      availability: { type: 'custom', range: [8, 10] }, duration_days: '7', frequency: 'once_daily', care_options: { detail: 'Option conservée' }, notes: 'Note conservée' },
  };
  await page.setViewportSize({ width: 360, height: 1000 });
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
  }, user);
  let submitted: Record<string, any> | undefined;
  let rejectSave = true;
  let uploadCalls = 0;
  await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
    if (path === '/api/appointments/fixture-edit' && request.method() === 'PUT') {
      submitted = request.postDataJSON();
      return route.fulfill({ json: { success: failure === 'document' || !rejectSave, error: rejectSave ? 'Enregistrement refusé pour le test' : undefined, data: appointment } });
    }
    if (path === '/api/medical-documents' && request.method() === 'POST') {
      uploadCalls++;
      return route.fulfill({ json: { success: !rejectSave, error: rejectSave ? 'Envoi refusé pour le test' : undefined, data: { id: 'fixture-document' } } });
    }
    if (path === '/api/appointments/fixture-edit') return route.fulfill({ json: { success: true, data: appointment } });
    if (path === '/api/categories') return route.fulfill({ json: { success: true, data: [{ id: categoryId, name: 'Injection', type: 'nursing', options: [{ option_key: 'detail', label: 'Détail du soin', field_type: 'text' }] }] } });
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.goto('/admin/appointments/fixture-edit/edit');
  await expect(page.getByRole('heading', { name: 'Modifier le rendez-vous', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Adresse\*?$/ })).toHaveValue('10 rue Exemple, 75001 Paris');
  if (failure === 'document') {
    const chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Ordonnance — ajouter un fichier', exact: true }).click();
    await (await chooser).setFiles({ name: 'ordonnance-fictive.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 fixture') });
  }
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect.poll(() => submitted).toBeTruthy();
  expect(submitted!.address).toMatchObject({ label: appointment.address, lat: 48.86, lng: 2.34 });
  expect(JSON.parse(submitted!.form_data.availability)).toEqual({ type: 'custom', range: [8, 10] });
  expect(submitted!.form_data.first_name).toBe('Louise');
  expect(submitted!.form_data.care_options.detail).toBe('Option conservée');
  expect(submitted!.form_data.duration_days).toBe('7');
  expect(submitted!.form_data.frequency).toBe('once_daily');
  expect(submitted!.scheduled_at).toBe('2027-10-15 08:00:00');
  expect(submitted!.form_data.nursing_items).toEqual([{ category_id: categoryId, label: 'Injection', care_options: { detail: 'Option conservée' }, sort_order: 0 }]);
  await expect(page).toHaveURL(/\/fixture-edit\/edit$/);
  if (failure === 'document') await expect(page.getByRole('alert').filter({ hasText: 'une pièce jointe' })).toBeVisible();
  rejectSave = false;
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page).toHaveURL(/\/appointments\/fixture-edit$/);
  if (failure === 'document') expect(uploadCalls).toBe(2);
});
}
