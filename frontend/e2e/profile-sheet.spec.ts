import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures/test';
import { apiRoutePattern, normalizeApiPathname } from './helpers/api-route';

test.describe.configure({ mode: 'parallel' });

const patient = { id: 'fixture-patient', role: 'patient', first_name: 'Louise', last_name: 'Exemple', email: 'fixture@example.invalid' };

const baseAppointment = {
  id: 'fixture-appointment',
  patient_id: patient.id,
  status: 'confirmed',
  scheduled_at: '2026-10-15 08:30:00',
  created_at: '2026-09-15 09:00:00',
  address: '10 rue Exemple, 75001 Paris',
  category_id: 'fixture-care',
  form_data: {
    first_name: 'Louise',
    last_name: 'Exemple',
    phone: '0100000000',
    birth_date: '1990-01-01',
    gender: 'female',
    address: { label: '10 rue Exemple, 75001 Paris', lat: 48.86, lng: 2.34 },
  },
};

const nurseAppointment = {
  ...baseAppointment,
  type: 'nursing',
  form_type: 'nursing',
  category_name: 'Pansement',
  assigned_nurse_id: 'fixture-nurse',
  assigned_nurse_display_name: 'Claire Martin',
  assigned_nurse_public_slug: 'claire-martin',
};

const labAppointment = {
  ...baseAppointment,
  type: 'blood_test',
  form_type: 'blood_test',
  category_name: 'Bilan sanguin',
  assigned_lab_id: 'fixture-lab',
  assigned_lab_display_name: 'Laboratoire Exemple',
  assigned_lab_public_slug: 'laboratoire-exemple',
};

const nurseProfile = {
  id: 'fixture-nurse',
  slug: 'claire-martin',
  name: 'Claire Martin',
  first_name: 'Claire',
  last_name: 'Martin',
  profile_image_url: null,
  biography: 'Infirmière libérale depuis 12 ans, soins à domicile 7j/7.',
  address: '75011 Paris',
  map_center: { lat: 48.85, lng: 2.37 },
  radius_km: 8,
  years_experience: '10_plus',
  qualifications: [{ code: 'DE', label: 'Diplôme d’État d’infirmier' }],
  is_accepting_appointments: true,
  website_url: 'claire-infirmiere.example',
  social_links: { linkedin: 'https://linkedin.example/claire' },
  specializations: [
    { id: 'c1', name: 'Pansement', description: 'Pansements simples et complexes', type: 'nursing' },
    { id: 'c2', name: 'Injection', type: 'nursing' },
  ],
  reviews: {
    stats: { total_reviews: 2, average_rating: 4.5 },
    items: [
      { id: 'r1', rating: 5, comment: 'Très professionnelle et ponctuelle.', patient_name: 'Marie D.' },
      { id: 'r2', rating: 4, comment: null, patient_name: 'Paul R.' },
    ],
  },
};

const labProfile = {
  id: 'fixture-lab',
  slug: 'laboratoire-exemple',
  name: 'Laboratoire Exemple',
  profile_image_url: null,
  biography: null,
  address: '5 avenue Exemple, 75012 Paris',
  map_center: { lat: 48.84, lng: 2.39 },
  opening_hours: { monday: { start: '07:30', end: '18:00' } },
  min_booking_lead_time_hours: 48,
  accept_rdv_saturday: true,
  accept_rdv_sunday: false,
  services: [{ id: 's1', name: 'Bilan sanguin' }],
  reviews: { stats: { total_reviews: 0, average_rating: 0 }, items: [] },
};

async function openAppointment(page: Page, appointment: Record<string, unknown>, publicProfile: { path: string; status: number; body: unknown }) {
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [user.role]: true }));
  }, patient);
  await page.route(apiRoutePattern(), route => {
    const path = normalizeApiPathname(route.request().url());
    if (path.startsWith('/api/_nuxt_icon')) return route.continue();
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user: patient, data: patient } });
    if (path === '/api/appointments/fixture-appointment') return route.fulfill({ json: { success: true, data: appointment } });
    if (path === publicProfile.path) return route.fulfill({ status: publicProfile.status, json: publicProfile.body });
    return route.fulfill({ json: { success: true, data: [], pagination: { pages: 1 } } });
  });
  await page.goto('/patient/appointments/fixture-appointment');
}

async function openSheet(page: Page, name: string) {
  await page.getByRole('button', { name: 'Voir le profil' }).first().click();
  const sheet = page.getByRole('dialog', { name });
  await expect(sheet).toBeVisible();
  await sheet.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished)));
  return sheet;
}

async function expectSheetInsideViewport(sheet: Locator, width: number) {
  const box = await sheet.boundingBox();
  if (!box) throw new Error('Profile sheet is not rendered');
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  if (width < 640) expect(box.width).toBeGreaterThanOrEqual(width - 1);
  expect(await sheet.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
}

for (const width of [360, 1440]) {
  test(`nurse profile sheet is readable at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await openAppointment(page, nurseAppointment, { path: '/api/public/nurse/claire-martin', status: 200, body: { success: true, data: nurseProfile } });

    const sheet = await openSheet(page, 'Profil infirmier');
    await expect(sheet.getByRole('heading', { name: 'Claire Martin' })).toBeVisible();
    await expect(sheet.getByText('Accepte des rendez-vous')).toBeVisible();
    await expect(sheet.getByText('Plus de 10 ans d’expérience')).toBeVisible();
    await expect(sheet.getByText('4,5')).toBeVisible();
    for (const title of ['Présentation', 'Soins proposés', 'Zone d’intervention', 'Diplômes et formations', 'Sur le web', 'Avis récents']) {
      await expect(sheet.getByText(title, { exact: true })).toBeVisible();
    }
    await expect(sheet.getByText('Très professionnelle et ponctuelle.')).toBeVisible();
    await expect(sheet.getByText('Paul R.')).toHaveCount(0);
    await expect(sheet.getByRole('link', { name: 'Prendre rendez-vous' })).toBeVisible();

    await expectSheetInsideViewport(sheet, width);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/profile-sheet-nurse-${width}.png` });
  });

  test(`lab profile sheet shows hours and booking rules at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openAppointment(page, labAppointment, { path: '/api/public/lab/laboratoire-exemple', status: 200, body: { success: true, data: labProfile } });

    const sheet = await openSheet(page, 'Profil laboratoire');
    await expect(sheet.getByRole('heading', { name: 'Laboratoire Exemple' })).toBeVisible();
    await expect(sheet.getByText('Adresse', { exact: true })).toBeVisible();
    await expect(sheet.getByText('Rendez-vous à réserver au moins 48 h à l’avance.')).toBeVisible();
    await expect(sheet.getByText('Pas de rendez-vous le dimanche.')).toBeVisible();
    await expect(sheet.getByText('Pas de rendez-vous le samedi.')).toHaveCount(0);
    await expect(sheet.getByText('Présentation', { exact: true })).toHaveCount(0);
    await expect(sheet.getByText('Avis récents', { exact: true })).toHaveCount(0);
    await expectSheetInsideViewport(sheet, width);
    await page.screenshot({ path: `test-results/profile-sheet-lab-${width}.png` });
  });
}

test('profile sheet reports a missing public profile without retry', async ({ page }) => {
  await openAppointment(page, nurseAppointment, { path: '/api/public/nurse/claire-martin', status: 404, body: { success: false, error: 'Profil introuvable' } });
  const sheet = await openSheet(page, 'Profil infirmier');
  await expect(sheet.getByText('Profil introuvable', { exact: true })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Réessayer' })).toHaveCount(0);
});
