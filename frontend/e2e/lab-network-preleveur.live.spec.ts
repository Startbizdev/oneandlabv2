import { execFileSync } from 'node:child_process';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test';
import { waitForHydration } from './helpers/wait-for-nuxt-ready';

// Aucun mock : frontend → API PHP → MySQL (comptes et zones créés par backend/scripts/e2e-live-seed.php).
const PASSWORD = 'E2e-Live-Cary-2026!';
const IDS = {
  patient: '00000000-0000-4000-8000-00000000a001',
  lab: '00000000-0000-4000-8000-00000000c001',
  labB: '00000000-0000-4000-8000-00000000c101',
  preleveur: '00000000-0000-4000-8000-00000000c003',
} as const;
const BIOGROUP = { id: 'a1000001-0001-4001-8001-000000000001', name: 'Biogroup', slug: 'biogroup' };
const MARSEILLE = { label: '1 La Canebière, 13001 Marseille', lat: 43.2965, lng: 5.3698, city: 'Marseille', postal_code: '13001' };

function mysql(sql: string): string {
  return execFileSync(
    'docker',
    ['compose', '-f', '../docker-compose.e2e-live.yml', 'exec', '-T', 'mysql-e2e', 'mysql', '-uroot', '-N', '-B', 'oneandlab_test', '-e', sql],
    { encoding: 'utf8' },
  ).trim();
}

const offersFor = (appointmentId: string) =>
  mysql(`SELECT profile_id FROM appointment_offers WHERE appointment_id = '${appointmentId}' ORDER BY profile_id`)
    .split('\n')
    .filter(Boolean);

async function login(page: Page, role: string, email: string) {
  await page.addInitScript(r => localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [r]: true })), role);
  await page.goto('/login?mode=password');
  await waitForHydration(page);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

/** Client API authentifié (Bearer + CSRF de la session) pour le compte connecté dans `page`. */
async function apiClient(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const authorization = `Bearer ${token}`;
  const csrfRes = await page.request.get('/api/auth/csrf-token', { headers: { Authorization: authorization } });
  const csrf = (await csrfRes.json()).data.csrf_token as string;
  const headers = { Authorization: authorization, 'X-CSRF-Token': csrf };
  const call = async (method: 'post' | 'put', path: string, data: unknown) => {
    const res = await page.request[method](`/api${path}`, { headers, data });
    return { status: res.status(), body: await res.json() };
  };
  return {
    post: (path: string, data: unknown) => call('post', path, data),
    put: (path: string, data: unknown) => call('put', path, data),
  };
}

function weekdayAt10(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return `${d.toISOString().slice(0, 10)} 10:00:00`;
}

function bloodTestPayload(patientId: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'blood_test',
    form_type: 'blood_test',
    patient_id: patientId,
    scheduled_at: weekdayAt10(5),
    address: MARSEILLE,
    patient_booking_consent: true,
    form_data: { first_name: 'E2E', last_name: 'Reseau', address: MARSEILLE },
    ...extra,
  };
}

test.describe.serial('réseau labo et demandes préleveur (live)', () => {
  test('admin relie Biogroup au labo A : seul le labo A reçoit le RDV réseau puis l’accepte', async ({ browser }) => {
    test.setTimeout(180_000);

    const admin = await browser.newPage();
    await login(admin, 'super_admin', 'admin@test.invalid');
    await admin.goto('/admin/lab-brands');
    await admin.getByRole('button', { name: `Modifier ${BIOGROUP.name}`, exact: true }).click();
    await admin.getByTestId('brand-lab-select').click();
    await admin.getByRole('option', { name: /Labo Central/ }).click();
    await admin.keyboard.press('Escape');
    await admin.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(admin.getByTestId(`brand-labs-${BIOGROUP.slug}`)).toContainText('Labo Central');
    expect(mysql(`SELECT lab_profile_id FROM lab_brand_labs WHERE brand_id = '${BIOGROUP.id}'`)).toBe(IDS.lab);
    await admin.close();

    const patient = await browser.newPage();
    await login(patient, 'patient', 'alice.patient@test.invalid');
    const created = await (await apiClient(patient)).post(
      '/appointments',
      bloodTestPayload(IDS.patient, {
        lab_preference_mode: 'brand_choice',
        preferred_lab_brand_id: BIOGROUP.id,
        form_data: {
          first_name: 'Alice',
          last_name: 'Patiente',
          address: MARSEILLE,
          lab_preference_mode: 'brand_choice',
          preferred_lab_brand_id: BIOGROUP.id,
        },
      }),
    );
    expect(created.status, JSON.stringify(created.body)).toBe(200);
    const appointmentId = created.body.data.id as string;
    await patient.close();

    await expect.poll(() => offersFor(appointmentId), { timeout: 15_000 }).toEqual([IDS.lab]);
    expect(mysql(`SELECT COUNT(*) FROM notifications WHERE user_id = '${IDS.labB}' AND data LIKE '%${appointmentId}%'`)).toBe('0');
    expect(mysql(`SELECT dispatch_mode FROM appointments WHERE id = '${appointmentId}'`)).toBe('patient_brand_choice');

    const lab = await browser.newPage();
    await login(lab, 'lab', 'labo@test.invalid');
    const accepted = await (await apiClient(lab)).put(`/appointments/${appointmentId}`, { status: 'confirmed' });
    expect(accepted.status, JSON.stringify(accepted.body)).toBe(200);
    expect(mysql(`SELECT CONCAT(status, '|', assigned_lab_id) FROM appointments WHERE id = '${appointmentId}'`)).toBe(
      `confirmed|${IDS.lab}`,
    );
    await lab.close();
  });

  test('le labo assigne un patient au préleveur, qui crée un patient et une demande attribuée ensuite par le labo', async ({ browser }) => {
    test.setTimeout(180_000);

    const lab = await browser.newPage();
    await login(lab, 'lab', 'labo@test.invalid');
    const labApi = await apiClient(lab);
    const assigned = await labApi.post(`/lab/preleveurs/${IDS.preleveur}/patients`, { patient_id: IDS.patient });
    expect(assigned.status, JSON.stringify(assigned.body)).toBe(200);

    const prel = await browser.newPage();
    await login(prel, 'preleveur', 'preleveur@test.invalid');
    await prel.goto('/preleveur/patients');
    await expect(prel.getByText('Alice', { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    const prelApi = await apiClient(prel);
    const newPatient = await prelApi.post('/patients', {
      first_name: 'Paulette',
      last_name: 'Prelevee',
      phone: '0611223344',
      patient_booking_consent: true,
    });
    expect(newPatient.status, JSON.stringify(newPatient.body)).toBe(200);
    const newPatientId = newPatient.body.data.id as string;
    expect(
      mysql(`SELECT source FROM patient_professional_access WHERE patient_id = '${newPatientId}' AND professional_id = '${IDS.lab}'`),
    ).toBe('lab_assignment');

    const nursing = await prelApi.post('/appointments', { ...bloodTestPayload(newPatientId), type: 'nursing', form_type: 'nursing' });
    expect(nursing.status).toBe(403);

    const request = await prelApi.post('/appointments', bloodTestPayload(newPatientId));
    expect(request.status, JSON.stringify(request.body)).toBe(200);
    const requestId = request.body.data.id as string;
    expect(
      mysql(`SELECT CONCAT(status, '|', assigned_lab_id, '|', IFNULL(assigned_to, 'NULL')) FROM appointments WHERE id = '${requestId}'`),
    ).toBe(`pending|${IDS.lab}|NULL`);
    await expect.poll(() => offersFor(requestId), { timeout: 15_000 }).toEqual([IDS.lab]);

    const reassigned = await labApi.post(`/appointments/${requestId}/reassign`, {
      assigned_lab_id: IDS.lab,
      assigned_to: IDS.preleveur,
    });
    expect(reassigned.status, JSON.stringify(reassigned.body)).toBe(200);
    expect(mysql(`SELECT assigned_to FROM appointments WHERE id = '${requestId}'`)).toBe(IDS.preleveur);

    await prel.close();
    await lab.close();
  });
});
