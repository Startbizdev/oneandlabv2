import { test, expect } from '@playwright/test';

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
    let listFails = true;
    let detailFails = true;
    let delayFirst = false;
    let firstReturned = false;
    let documentsFail = true;
    let oldDocumentsReturned = false;
    let writes = 0;
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url());
      if (route.request().method() !== 'GET') writes++;
      if (url.pathname === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
      if (url.pathname === '/api/categories') return route.fulfill({ json: { success: !catalogFails, data: [] } });
      if (url.pathname === '/api/patients') return route.fulfill({ json: listFails && url.searchParams.get('page') === '2'
        ? { success: false } : { success: true, data: [patients[url.searchParams.get('page') === '2' ? 1 : 0]], pagination: { pages: 2 } } });
      if (url.pathname === '/api/patient-documents') {
        const id = url.searchParams.get('user_id');
        if (delayFirst && id === 'patient-a') await new Promise(resolve => setTimeout(resolve, 1600));
        await route.fulfill({ json: { success: !documentsFail, data: [{ document_type: 'carte_vitale', file_name: `${id}-vitale.pdf`, medical_document_id: `${id}-document` }] } });
        if (delayFirst && id === 'patient-a') oldDocumentsReturned = true;
        return;
      }
      const patient = patients.find(p => url.pathname === `/api/users/${p.id}`);
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
    await expect(page.getByText('Catalogue de soins indisponible', { exact: true })).toBeVisible();
    catalogFails = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await page.getByRole('button', { name: 'Configurer et ajouter Prélèvement', exact: true }).click();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    const dates = page.locator('.booking-date-carousel [data-booking-date-scroller] > div:not([inert]) button:not([disabled])');
    await dates.nth(1).click();
    await page.getByRole('radio', { name: 'Toute la journée', exact: true }).click();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    // Document step remains optional for this synthetic care.
    if (!(await page.getByRole('button', { name: 'Choisir un patient', exact: true }).count())) {
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    }
    await expect(page.getByText('Liste des patients indisponible', { exact: true })).toBeVisible();
    listFails = false;
    await page.getByRole('button', { name: 'Recharger les patients', exact: true }).click();
    const picker = page.getByRole('button', { name: 'Choisir un patient', exact: true });
    await picker.click();
    await page.getByRole('option', { name: /Béatrice Exemple/ }).click();
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
    await page.getByRole('option', { name: /Alice Exemple/ }).click();
    await picker.click();
    await page.getByRole('option', { name: /Béatrice Exemple/ }).click();
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
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
      if (url.pathname === '/api/patients') return route.fulfill({ json: failed && url.searchParams.get('page') === '2'
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
