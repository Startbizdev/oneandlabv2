import { test, expect, type Page } from '@playwright/test';

async function fixture(page: Page) {
  const user = { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
  await page.setViewportSize({ width: 360, height: 900 });
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
  }, user);
  const category = { id: '11111111-1111-4111-8111-111111111111', name: 'Injection', type: 'nursing', options: [] };
  const series = { id: 'fixture-series', patient_id: 'fixture-patient', planning_type: 'single_day', planning_config: { start_date: '2027-10-15' }, first_date: '2027-10-15', time_slot: 'morning', duration_minutes: 30, at_home: true, notes: 'Note existante', nursing_items: [{ category_id: category.id, label: category.name }] };
  const appointment = { id: 'fixture-appointment', patient_id: 'fixture-patient', type: 'nursing', status: 'confirmed', scheduled_at: '2027-10-15 08:00:00', category_id: category.id, form_data: { notes: 'Note existante', nursing_items: series.nursing_items, availability: JSON.stringify({ type: 'custom', range: [8, 12] }) } };
  const state = { reject: false, rejectLoad: false, rejectOptions: false, writes: [] as Array<Record<string, any>> };
  await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, data: user, user } });
    if (['POST', 'PUT', 'PATCH'].includes(request.method()) && (path.includes('/passages/series') || path === '/api/appointments/fixture-appointment')) {
      state.writes.push(request.postDataJSON());
      return route.fulfill({ json: { success: !state.reject, error: state.reject ? 'Enregistrement indisponible' : undefined, data: { series, created_appointments: 1 } } });
    }
    if (path === '/api/categories') return route.fulfill({ json: { success: !(state.rejectOptions && url.searchParams.has('category_options_for')), data: url.searchParams.has('category_options_for') ? [] : [category] } });
    if (path === '/api/nurse/passages/series/fixture-series') return route.fulfill({ json: { success: !state.rejectLoad, data: series } });
    if (path === '/api/appointments/fixture-appointment') return route.fulfill({ json: { success: !state.rejectLoad, data: appointment } });
    if (path.startsWith('/api/users/')) {
      const pid = path.replace('/api/users/', '').split('?')[0];
      if (pid === 'me') return route.fulfill({ json: { success: true, data: user } });
      return route.fulfill({ json: { success: true, data: { id: 'fixture-patient', first_name: 'Louise', last_name: 'Exemple' } } });
    }
    if (path.startsWith('/api/medical-documents')) {
      return route.fulfill({ json: { success: true, data: [] } });
    }
    return route.fulfill({ json: { success: true, data: [] } });
  });
  return state;
}

test('nurse rdv detail reloads when appointment_id query changes', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/appointments/fixture-appointment-2', route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 'fixture-appointment-2',
          patient_id: 'fixture-patient-2',
          type: 'nursing',
          status: 'confirmed',
          scheduled_at: '2027-10-15 10:00:00',
          category_id: '11111111-1111-4111-8111-111111111111',
          form_data: { notes: 'Autre patient', nursing_items: [], availability: JSON.stringify({ type: 'custom', range: [10, 14] }) },
        },
      },
    }),
  );
  await page.route('**/api/users/fixture-patient-2*', route =>
    route.fulfill({ json: { success: true, data: { id: 'fixture-patient-2', first_name: 'Paul', last_name: 'Autre' } } }),
  );
  await page.goto('/nurse/passage/rdv?appointment_id=fixture-appointment');
  await expect(page.getByRole('status', { name: 'Chargement du passage' })).toBeHidden({ timeout: 15_000 });
  await expect(page.getByText('Louise Exemple', { exact: true })).toBeVisible();
  await page.goto('/nurse/passage/rdv?appointment_id=fixture-appointment-2');
  await expect(page.getByText('Paul Autre', { exact: true })).toBeVisible();
});

for (const kind of ['series', 'appointment']) {
  test(`nurse ${kind} load failure offers a working retry`, async ({ page }) => {
    const state = await fixture(page);
    state.rejectLoad = true;
    await page.goto(kind === 'series' ? '/nurse/passage/fixture-series' : '/nurse/passage/rdv?appointment_id=fixture-appointment');
    await expect(page.getByText('Passage indisponible', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Note / })).toHaveCount(0);
    state.rejectLoad = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Note / })).toBeVisible();
    await expect(page.getByText('Passage indisponible', { exact: true })).toBeHidden();
  });
  test(`nurse ${kind} edit opens dialog, preserves note after failure and retries`, async ({ page }) => {
    const state = await fixture(page);
    await page.goto(kind === 'series' ? '/nurse/passage/fixture-series' : '/nurse/passage/rdv?appointment_id=fixture-appointment');
    await page.getByRole('button', { name: /^Note / }).click();
    const dialog = page.getByRole('dialog', { name: 'Note', exact: true });
    await expect(dialog.getByPlaceholder('Note interne (optionnelle)')).toHaveValue('Note existante');
    await dialog.getByPlaceholder('Note interne (optionnelle)').fill('Note corrigée');
    state.reject = true;
    await dialog.getByRole('button', { name: 'Valider', exact: true }).click();
    await expect.poll(() => state.writes.length).toBe(1);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByPlaceholder('Note interne (optionnelle)')).toHaveValue('Note corrigée');
    state.reject = false;
    await dialog.getByRole('button', { name: 'Valider', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(state.writes).toHaveLength(2);
    expect(kind === 'series' ? state.writes[1].notes : state.writes[1].form_data.notes).toBe('Note corrigée');
    if (kind === 'appointment') {
      await page.getByRole('button', { name: 'Documents', exact: true }).click();
      await expect(page.getByText('Ordonnance', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Ajouter', exact: true })).toHaveCount(5);
      await expect(page.locator('input[type="file"]')).toHaveCount(6);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('nurse creates a passage with selected care and a note', async ({ page }) => {
  const state = await fixture(page);
  await page.goto('/nurse/passage/new?patient_id=fixture-patient&start_date=2027-10-15');
  await page.getByRole('button', { name: /^Soins / }).click();
  const care = page.getByRole('dialog', { name: 'Soins', exact: true });
  await care.getByRole('button', { name: 'Ajouter un soin', exact: true }).click();
  state.rejectOptions = true;
  await page.getByRole('button', { name: /Injection/ }).click();
  await expect(page.getByText('Soin non ajouté', { exact: true })).toBeVisible();
  await expect(care.getByRole('button', { name: 'Retirer le soin', exact: true })).toHaveCount(0);
  state.rejectOptions = false;
  await page.getByRole('button', { name: /Injection/ }).click();
  await care.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByRole('button', { name: /^Note / }).click();
  const note = page.getByRole('dialog', { name: 'Note', exact: true });
  await note.getByPlaceholder('Note interne (optionnelle)').fill('Note de création');
  await note.getByRole('button', { name: 'Valider', exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer le passage', exact: true }).click();
  await expect(page).toHaveURL(/\/nurse\/tournee$/);
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0]).toMatchObject({ patient_id: 'fixture-patient', notes: 'Note de création', planning_type: 'single_day', nursing_items: [{ category_id: '11111111-1111-4111-8111-111111111111', label: 'Injection' }] });
});
