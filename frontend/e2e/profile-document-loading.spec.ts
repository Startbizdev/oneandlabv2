import { test, expect, type Page } from '@playwright/test';

const user = { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
async function authenticate(page: Page) {
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
  }, user);
}
const document = (name: string) => ({ document_type: 'carte_vitale', medical_document_id: `fixture-${name}`, file_name: `${name}.pdf` });
async function changeProfile(page: Page, query: string) {
  // Simulate same-document browser history navigation without remounting the page.
  await page.evaluate(query => {
    window.history.pushState({}, '', `/profile?${query}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, query);
}

test('patient dossier: unavailable documents have a retry, without a false empty library', async ({ page }) => {
  await authenticate(page);
  let failed = true;
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/users/fixture-patient') return route.fulfill({ json: { success: true, data: { id: 'fixture-patient', role: 'patient', first_name: 'Louise', last_name: 'Exemple' } } });
    if (path === '/api/patient-documents') return route.fulfill({ json: failed
      ? { success: false, error: 'La bibliothèque est temporairement indisponible.' }
      : { success: true, data: [document('Couverture')] } });
    return route.fulfill({ json: { success: true, user, data: path.endsWith('/auth/me') ? user : [] } });
  });
  await page.goto('/profile?userId=fixture-patient');
  await expect(page.getByText('Documents indisponibles', { exact: true })).toBeVisible();
  await expect(page.getByText('Aucun document de couverture enregistré.', { exact: true })).toBeHidden();
  await expect(page.getByRole('textbox', { name: /^Prénom/ })).toHaveValue('Louise');
  failed = false;
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(page.locator('#rdv-doc-fixture-Couverture')).toBeVisible();
});

test('patient dossier: delayed documents cannot cross profiles or survive the creation mode', async ({ page }) => {
  await authenticate(page);
  let firstRequested = false;
  let releaseFirst!: () => void;
  const waiting = new Promise<void>(resolve => { releaseFirst = resolve; });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.startsWith('/api/users/fixture-')) {
      const id = path.split('/').pop();
      return route.fulfill({ json: { success: true, data: { id, role: 'patient', first_name: id === 'fixture-first' ? 'Première' : 'Seconde', last_name: 'Exemple' } } });
    }
    if (path === '/api/patient-documents') {
      if (url.searchParams.get('user_id') === 'fixture-first') {
        firstRequested = true;
        await waiting;
        return route.fulfill({ json: { success: true, data: [document('Ancienne')] } });
      }
      return route.fulfill({ json: { success: true, data: [document('Actuelle')] } });
    }
    return route.fulfill({ json: { success: true, user, data: path.endsWith('/auth/me') ? user : [] } });
  });
  await page.goto('/profile?userId=fixture-first');
  await expect.poll(() => firstRequested).toBe(true);
  await changeProfile(page, 'userId=fixture-second');
  await expect(page.getByRole('textbox', { name: /^Prénom/ })).toHaveValue('Seconde');
  await expect(page.locator('#rdv-doc-fixture-Actuelle')).toBeVisible();
  const oldResponse = page.waitForResponse(response => response.url().includes('patient-documents?user_id=fixture-first'));
  releaseFirst();
  await oldResponse;
  await expect(page.locator('#rdv-doc-fixture-Ancienne')).toBeHidden();
  await expect(page.locator('#rdv-doc-fixture-Actuelle')).toBeVisible();
  await changeProfile(page, 'newPatient=1');
  await expect(page.getByRole('heading', { name: 'Créer un patient', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /^Prénom/ })).toHaveValue('');
  await expect(page.locator('#rdv-doc-fixture-Actuelle')).toBeHidden();
});
