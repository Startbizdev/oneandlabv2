import { test, expect, type Page } from '@playwright/test';
import labBrands from './fixtures/lab-brands.json';

test.setTimeout(120_000);

const API_ROUTE = /^https?:\/\/[^/]+\/api\//;

function isPatientsListPath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, '');
  return p === '/api/patients' || p.endsWith('/patients');
}

const patientSearchInput = (page: Page) =>
  page.getByPlaceholder('Rechercher par nom, email, téléphone, date de naissance…');

async function searchPatientInPicker(page: Page, query: string) {
  await patientSearchInput(page).fill(query);
  // Debounce runPatientSearch (280 ms) + rendu USelectMenu
  await page.waitForTimeout(350);
}

async function pickPatientOption(page: Page, name: RegExp) {
  const pickerBtn = page.getByRole('button', { name: 'Choisir un patient', exact: true });
  if (!(await patientSearchInput(page).isVisible().catch(() => false))) {
    await pickerBtn.click();
  }
  const option = page.getByRole('option', { name });
  await expect(option.first()).toBeVisible({ timeout: 20_000 });
  await patientSearchInput(page).focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
}

async function advanceWizardPastLabBrandStep(page: Page) {
  const validate = page.getByRole('button', { name: 'Valider et ajouter', exact: true });
  if (await validate.isVisible().catch(() => false)) {
    await validate.click();
  }
  const labHeading = page.getByRole('heading', { name: 'Choix du laboratoire', exact: true });
  if (!(await labHeading.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  }
  if (await labHeading.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  }
}

for (const role of ['super_admin', 'lab', 'subaccount', 'pro']) {
  test(`${role}: booking recovers lists and keeps the selected patient during delayed responses`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    const user = { id: 'fixture-staff', role, first_name: 'Camille', last_name: 'Exemple' };
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [user.role]: true }));
    }, user);
    const patients = [
      { id: 'patient-a', first_name: 'Alice', last_name: 'Exemple', gender: 'female', birth_date: '1984-02-10' },
      { id: 'patient-b', first_name: 'Béatrice', last_name: 'Exemple', gender: 'female', birth_date: '1990-03-15' },
    ];
    let catalogFails = true;
    let patientSearchFails = true;
    let detailFails = true;
    let delayFirst = false;
    let firstReturned = false;
    let documentsFail = true;
    let oldDocumentsReturned = false;
    let writes = 0;
    await page.route(API_ROUTE, async route => {
      const url = new URL(route.request().url());
      if (route.request().method() !== 'GET') writes++;
      if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
      if (url.pathname.endsWith('/categories')) {
        return route.fulfill({
          json: {
            success: !catalogFails,
            data: catalogFails ? [] : [{ id: 'fixture-blood', name: 'Prélèvement', type: 'blood_test', icon: 'droplet', options: [], is_active: 1 }],
          },
        });
      }
      if (url.pathname.endsWith('/auth/csrf-token')) {
        return route.fulfill({ json: { success: true, data: { csrf_token: 'fixture-csrf' } } });
      }
      if (url.pathname.endsWith('/public/lab-brands')) {
        return route.fulfill({ json: { success: true, data: labBrands } });
      }
      if (url.pathname.endsWith('/public/provider-name')) {
        return route.fulfill({ json: { success: true, data: { name: 'Prestataire fixture' } } });
      }
      if (isPatientsListPath(url.pathname)) {
        const search = (url.searchParams.get('search') || '').toLowerCase();
        if (patientSearchFails && search.length >= 2) {
          return route.fulfill({ json: { success: false, error: 'Indisponible' } });
        }
        const match = patients.filter(p =>
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(search) || search.includes('ex'),
        );
        return route.fulfill({
          json: {
            success: true,
            data: match.length ? match : patients,
            pagination: { page: 1, pages: 1 },
          },
        });
      }
      if (url.pathname.endsWith('/patient-documents')) {
        const id = url.searchParams.get('user_id');
        if (delayFirst && id === 'patient-a') await new Promise(resolve => setTimeout(resolve, 1600));
        await route.fulfill({ json: { success: !documentsFail, data: [{ document_type: 'carte_vitale', file_name: `${id}-vitale.pdf`, medical_document_id: `${id}-document` }] } });
        if (delayFirst && id === 'patient-a') oldDocumentsReturned = true;
        return;
      }
      const patient = patients.find(p => url.pathname.endsWith(`/users/${p.id}`));
      if (patient) {
        if (delayFirst && patient.id === 'patient-a') {
          await new Promise(resolve => setTimeout(resolve, 1300));
          await route.fulfill({ json: { success: true, data: patient } });
          firstReturned = true;
          return;
        }
        return route.fulfill({ json: { success: !detailFails, data: patient } });
      }
      return route.fulfill({ json: { success: true, data: [], pagination: { pages: 1 } } });
    });
    await page.goto(`/${role === 'super_admin' ? 'admin' : role}/appointments/new`);
    await expect(page.locator('main')).not.toContainText('Chargement du formulaire', { timeout: 90_000 });
    const catalogueError = page.getByText('Catalogue de soins indisponible', { exact: true });
    const catalogueReady = page.getByRole('button', { name: /Configurer et ajouter Prélèvement/ });
    await expect(catalogueError.or(catalogueReady)).toBeVisible({ timeout: 30_000 });
    catalogFails = false;
    if (await catalogueError.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
      await expect(catalogueReady).toBeVisible({ timeout: 15_000 });
    }
    await catalogueReady.click();
    await advanceWizardPastLabBrandStep(page);
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    const dates = page.locator('.booking-date-carousel [data-booking-date-scroller] > div:not([inert]) button:not([disabled])');
    await dates.nth(1).click();
    await page.getByRole('radio', { name: 'Toute la journée', exact: true }).click();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    // Document step remains optional for this synthetic care.
    if (!(await page.getByRole('button', { name: 'Choisir un patient', exact: true }).count())) {
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    }
    const picker = page.getByRole('button', { name: 'Choisir un patient', exact: true });
    await picker.click();
    await page.getByPlaceholder('Rechercher par nom, email, téléphone, date de naissance…').fill('Exemple');
    await expect(page.getByText('Liste des patients indisponible', { exact: true })).toBeVisible();
    patientSearchFails = false;
    const patientsReload = page.waitForResponse(r => r.url().includes('/patients') && r.ok());
    await page.getByRole('button', { name: 'Recharger les patients', exact: true }).click();
    await patientsReload;
    await expect(page.getByText('Liste des patients indisponible', { exact: true })).toHaveCount(0);
    await picker.click();
    await searchPatientInPicker(page, 'Béatrice');
    await pickPatientOption(page, /Béatrice Exemple/);
    await expect(page.getByText('Dossier patient indisponible', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confirmer le rendez-vous', exact: true })).toBeDisabled();
    detailFails = false;
    await page.getByRole('button', { name: 'Recharger le dossier', exact: true }).click();
    await expect(page.getByRole('textbox', { name: /^Prénom/ })).toHaveValue('Béatrice');
    await expect(page.getByText('Documents enregistrés indisponibles', { exact: true })).toBeVisible();
    documentsFail = false;
    await page.getByRole('button', { name: 'Recharger les documents', exact: true }).click();
    await expect(page.getByText('patient-b-vitale.pdf', { exact: true })).toBeVisible();
    delayFirst = true;
    await picker.click();
    await searchPatientInPicker(page, 'Alice');
    await pickPatientOption(page, /Alice Exemple/);
    await picker.click();
    await searchPatientInPicker(page, 'Béatrice');
    await pickPatientOption(page, /Béatrice Exemple/);
    await expect.poll(() => firstReturned).toBe(true);
    await expect.poll(() => oldDocumentsReturned).toBe(true);
    await expect(page.getByText('patient-b-vitale.pdf', { exact: true })).toBeVisible();
    await expect(page.getByText('patient-a-vitale.pdf', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('textbox', { name: /^Prénom/ })).toHaveValue('Béatrice');
    expect(writes).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/staff-booking-${role}-360.png`, fullPage: true });
    await page.getByRole('button', { name: 'Nouveau patient', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Jour de naissance', exact: true })).toContainText('Jour');
    await expect(page.getByRole('combobox', { name: 'Mois de naissance', exact: true })).toContainText('Mois');
    await expect(page.getByRole('combobox', { name: 'Année de naissance', exact: true })).toContainText('Année');
    await page.getByRole('combobox', { name: 'Jour de naissance', exact: true }).click();
    await page.getByRole('option', { name: '12', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Jour de naissance', exact: true })).toContainText('12');
  });
}

for (const role of ['lab', 'subaccount']) {
  test(`${role}: patient directory retries an interrupted second page`, async ({ page }) => {
    const user = { id: 'fixture-staff', role };
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
    }, user);
    let failed = true;
    await page.route(API_ROUTE, route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
      if (url.pathname.endsWith('/patients')) return route.fulfill({ json: failed && url.searchParams.get('page') === '2'
        ? { success: false } : { success: true, data: [{ id: url.searchParams.get('page'), first_name: url.searchParams.get('page') === '2' ? 'Béatrice' : 'Alice', last_name: 'Exemple' }], pagination: { pages: 2 } } });
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto(`/${role}/patients`);
    await expect(page.getByText('Impossible de charger vos patients', { exact: true })).toBeVisible();
    await expect(page.getByText('Aucun patient trouvé', { exact: true })).toHaveCount(0);
    failed = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByText('Béatrice Exemple', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: 'Rechercher un patient', exact: true }).fill('Béatrice');
    await expect(page.getByText('Alice Exemple', { exact: true })).toHaveCount(0);
  });
}

test('nurse: existing documents copy 403 still keeps the created appointment without duplicating it', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  const user = { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
  const patient = {
    id: 'patient-b',
    first_name: 'Béatrice',
    last_name: 'Exemple',
    gender: 'female',
    birth_date: '1990-03-15',
    phone: '0600000000',
    email: 'beatrice@example.invalid',
    address: { label: '10 rue Exemple, 75001 Paris', lat: 48.86, lng: 2.34 },
  };
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
  }, user);
  const created = {
    id: 'created-apt-1',
    patient_id: patient.id,
    type: 'blood_test',
    form_type: 'blood_test',
    status: 'confirmed',
    created_by: user.id,
    assigned_nurse_id: null,
    assigned_lab_id: 'fixture-lab',
    form_data: {
      first_name: patient.first_name,
      last_name: patient.last_name,
      phone: patient.phone,
      birth_date: patient.birth_date,
      gender: patient.gender,
      address: patient.address,
    },
  };
  let appointmentPosts = 0;
  let copyPosts = 0;
  await page.route(API_ROUTE, async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
    if (url.pathname.endsWith('/auth/csrf-token')) {
      return route.fulfill({ json: { success: true, data: { csrf_token: 'fixture-csrf' } } });
    }
    if (url.pathname.endsWith('/patients')) {
      const search = (url.searchParams.get('search') || '').toLowerCase();
      if (search.length >= 2) {
        return route.fulfill({ json: { success: true, data: [patient], pagination: { pages: 1 } } });
      }
      return route.fulfill({ json: { success: true, data: [], pagination: { pages: 1 } } });
    }
    if (url.pathname.endsWith('/patient-documents')) {
      return route.fulfill({
        json: {
          success: true,
          data: [{ document_type: 'carte_vitale', file_name: 'patient-b-vitale.pdf', medical_document_id: 'patient-b-document' }],
        },
      });
    }
    if (url.pathname.endsWith(`/users/${patient.id}`)) {
      return route.fulfill({ json: { success: true, data: patient } });
    }
    if (url.pathname.endsWith('/appointments') && method === 'POST') {
      appointmentPosts++;
      return route.fulfill({ json: { success: true, data: created } });
    }
    if (url.pathname.endsWith('/medical-documents/copy') && method === 'POST') {
      copyPosts++;
      return route.fulfill({
        status: 403,
        json: { success: false, error: 'Accès refusé au document source ou au rendez-vous' },
      });
    }
    if (url.pathname.endsWith(`/appointments/${created.id}`)) {
      return route.fulfill({ json: { success: true, data: created } });
    }
    if (url.pathname.endsWith(`/appointments/${created.id}/conversation`)) {
      return route.fulfill({ json: { success: true, data: { messages: [], can_post: true } } });
    }
    return route.fulfill({ json: { success: true, data: [], pagination: { pages: 1 } } });
  });

  await page.goto('/nurse/appointments/new');
  await page.getByRole('button', { name: 'Configurer et ajouter Prélèvement', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  const dates = page.locator('.booking-date-carousel [data-booking-date-scroller] > div:not([inert]) button:not([disabled])');
  await dates.nth(1).click();
  await page.getByRole('radio', { name: 'Toute la journée', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  if (!(await page.getByRole('button', { name: 'Choisir un patient', exact: true }).count())) {
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Choisir un patient', exact: true }).click();
  await searchPatientInPicker(page, 'Béatrice');
  await pickPatientOption(page, /Béatrice Exemple/);
  await expect(page.getByText('patient-b-vitale.pdf', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: /Je confirme que le patient/ }).check();
  const confirm = page.getByRole('button', { name: 'Confirmer le rendez-vous', exact: true });
  await confirm.click();
  await expect(confirm).toBeDisabled();
  await expect(page).toHaveURL(/\/nurse\/appointments\/created-apt-1/, { timeout: 5000 });
  await expect(page.getByRole('button', { name: 'Confirmer le rendez-vous', exact: true })).toHaveCount(0);
  await expect.poll(() => copyPosts).toBe(1);
  expect(appointmentPosts).toBe(1);
});

async function nurseBloodBookingThroughConfirm(page: import('@playwright/test').Page, hooks: {
  abortFirstAppointmentPost?: boolean;
  onCopy?: () => Promise<void> | void;
} = {}) {
  const user = { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
  const patient = {
    id: 'patient-b',
    first_name: 'Béatrice',
    last_name: 'Exemple',
    gender: 'female',
    birth_date: '1990-03-15',
    phone: '0600000000',
    email: 'beatrice@example.invalid',
    address: { label: '10 rue Exemple, 75001 Paris', lat: 48.86, lng: 2.34 },
  };
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
  }, user);
  const created = {
    id: 'created-apt-1',
    patient_id: patient.id,
    type: 'blood_test',
    form_type: 'blood_test',
    status: 'pending',
    created_by: user.id,
    assigned_nurse_id: user.id,
    assigned_lab_id: 'fixture-lab',
    form_data: {
      first_name: patient.first_name,
      last_name: patient.last_name,
      phone: patient.phone,
      birth_date: patient.birth_date,
      gender: patient.gender,
      address: patient.address,
    },
  };
  const stats = { appointmentPosts: 0, copyPosts: 0, requestIds: [] as string[] };
  await page.route(API_ROUTE, async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
    if (url.pathname.endsWith('/auth/csrf-token')) {
      return route.fulfill({ json: { success: true, data: { csrf_token: 'fixture-csrf' } } });
    }
    if (url.pathname.endsWith('/patients')) {
      const search = (url.searchParams.get('search') || '').toLowerCase();
      if (search.length >= 2) {
        return route.fulfill({ json: { success: true, data: [patient], pagination: { pages: 1 } } });
      }
      return route.fulfill({ json: { success: true, data: [], pagination: { pages: 1 } } });
    }
    if (url.pathname.endsWith('/patient-documents')) {
      return route.fulfill({
        json: {
          success: true,
          data: [{ document_type: 'carte_vitale', file_name: 'patient-b-vitale.pdf', medical_document_id: 'patient-b-document' }],
        },
      });
    }
    if (url.pathname.endsWith(`/users/${patient.id}`)) {
      return route.fulfill({ json: { success: true, data: patient } });
    }
    if (url.pathname.endsWith('/appointments') && method === 'POST') {
      stats.appointmentPosts++;
      const body = route.request().postDataJSON() as { client_request_id?: string };
      if (body?.client_request_id) stats.requestIds.push(body.client_request_id);
      if (hooks.abortFirstAppointmentPost && stats.appointmentPosts === 1) {
        return route.abort('internetdisconnected');
      }
      return route.fulfill({ json: { success: true, data: created } });
    }
    if (url.pathname.endsWith('/medical-documents/copy') && method === 'POST') {
      stats.copyPosts++;
      await hooks.onCopy?.();
      return route.fulfill({
        status: 403,
        json: { success: false, error: 'Accès refusé au document source ou au rendez-vous' },
      });
    }
    if (url.pathname.endsWith(`/appointments/${created.id}`)) {
      return route.fulfill({ json: { success: true, data: created } });
    }
    if (url.pathname.endsWith(`/appointments/${created.id}/conversation`)) {
      return route.fulfill({ json: { success: true, data: { messages: [], can_post: true } } });
    }
    return route.fulfill({ json: { success: true, data: [], pagination: { pages: 1 } } });
  });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/nurse/appointments/new');
  await page.getByRole('button', { name: 'Configurer et ajouter Prélèvement', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  const dates = page.locator('.booking-date-carousel [data-booking-date-scroller] > div:not([inert]) button:not([disabled])');
  await dates.nth(1).click();
  await page.getByRole('radio', { name: 'Toute la journée', exact: true }).click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  if (!(await page.getByRole('button', { name: 'Choisir un patient', exact: true }).count())) {
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Choisir un patient', exact: true }).click();
  await searchPatientInPicker(page, 'Béatrice');
  await pickPatientOption(page, /Béatrice Exemple/);
  await expect(page.getByText('patient-b-vitale.pdf', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: /Je confirme que le patient/ }).check();
  const confirm = page.getByRole('button', { name: 'Confirmer le rendez-vous', exact: true });
  await confirm.click();
  return { confirm, stats };
}

test('nurse: copy hang does not keep the wizard after POST 200', async ({ page }) => {
  let releaseCopy: () => void = () => undefined;
  const copyHeld = new Promise<void>(resolve => {
    releaseCopy = resolve;
  });
  await nurseBloodBookingThroughConfirm(page, {
    onCopy: () => copyHeld,
  });
  const afterClick = Date.now();
  await expect(page).toHaveURL(/\/nurse\/appointments\/created-apt-1/, { timeout: 8000 });
  expect(Date.now() - afterClick).toBeLessThan(8000);
  await expect(page.getByRole('button', { name: 'Confirmer le rendez-vous', exact: true })).toHaveCount(0);
  releaseCopy();
});

test('nurse: network error then same client_request_id does not duplicate the appointment', async ({ page }) => {
  const { stats } = await nurseBloodBookingThroughConfirm(page, {
    abortFirstAppointmentPost: true,
  });
  await expect(page).toHaveURL(/\/nurse\/appointments\/created-apt-1/, { timeout: 15000 });
  expect(stats.appointmentPosts).toBe(2);
  expect(new Set(stats.requestIds).size).toBe(1);
});

