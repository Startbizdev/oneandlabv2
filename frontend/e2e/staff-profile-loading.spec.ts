import { test, expect } from '@playwright/test';

for (const relative of [false, true]) {
  test(`staff profile: ${relative ? 'relative' : 'patient'} lookup failure cannot expose an editable fallback`, async ({ page }) => {
    const user = { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
    }, user);
    let failed = true;
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/users/fixture-patient') return route.fulfill({ json: { success: relative || !failed, data: { id: 'fixture-patient', role: 'patient', first_name: 'Titulaire', last_name: 'Exemple', email: 'fixture@example.invalid', phone: '0600000000' } } });
      if (path === '/api/patient-relatives/fixture-relative') return route.fulfill({ json: { success: !failed, data: { id: 'fixture-relative', patient_id: 'fixture-patient', first_name: 'Proche', last_name: 'Exemple', relationship_type: 'child' } } });
      return route.fulfill({ json: { success: true, user, data: path.endsWith('/auth/me') ? user : [] } });
    });
    await page.goto(`/profile?userId=fixture-patient${relative ? '&relativeId=fixture-relative' : ''}`);
    await expect(page.getByText('Profil indisponible', { exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^Prénom/ })).toBeHidden();
    failed = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByRole('textbox', { name: /^Prénom/ })).toHaveValue(relative ? 'Proche' : 'Titulaire');
    if (relative) await expect(page).toHaveURL(/relativeId=fixture-relative/);
  });
}
