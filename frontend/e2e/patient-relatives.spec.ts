import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  test(`relatives: load, edit and create retries preserve the right form at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const user = { id: 'fixture-patient', role: 'patient', first_name: 'Camille', last_name: 'Exemple' };
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ patient: true }));
    }, user);
    let relatives = [{ id: 'relative-a', first_name: 'Alice', last_name: 'Exemple', relationship_type: 'parent', email: 'fixture@example.invalid', phone: '', gender: 'female', birth_date: '1960-03-15' }];
    let listFails = true;
    let detailFails = true;
    let saveFails = true;
    const writes: { method: string; body: any }[] = [];
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      if (url.pathname === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
      if (url.pathname.startsWith('/api/patient-relatives')) {
        if (method === 'GET') return route.fulfill({ json: url.pathname.endsWith('/relative-a')
          ? { success: !detailFails, data: relatives[0] } : { success: !listFails, data: relatives } });
        const body = route.request().postDataJSON();
        writes.push({ method, body });
        if (saveFails) return route.fulfill({ json: { success: false, error: 'Enregistrement indisponible' } });
        if (method === 'PUT') relatives[0] = { ...relatives[0], ...body };
        if (method === 'POST') relatives.push({ id: 'relative-b', ...body });
        if (method === 'DELETE') relatives = relatives.filter(relative => !url.pathname.endsWith(`/${relative.id}`));
        return route.fulfill({ json: { success: true, data: relatives.at(-1) } });
      }
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/patient/relatives');
    await expect(page.getByText('Impossible de charger vos proches', { exact: true })).toBeVisible();
    await expect(page.getByText('Aucun proche enregistré', { exact: true })).toHaveCount(0);
    listFails = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await page.getByRole('button', { name: 'Actions pour Alice Exemple', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Modifier', exact: true }).click();
    await expect(page.getByText('Dossier du proche indisponible', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer', exact: true })).toBeDisabled();
    detailFails = false;
    await page.getByRole('button', { name: 'Recharger le proche', exact: true }).click();
    const firstName = page.getByRole('textbox', { name: /^Prénom/ });
    await firstName.fill('Alicia');
    await page.getByRole('textbox', { name: 'Email', exact: true }).fill('');
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Enregistrement indisponible', { exact: true })).toBeVisible();
    await expect(firstName).toHaveValue('Alicia');
    saveFails = false;
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Alicia Exemple', exact: true })).toBeVisible();
    expect(writes[1].body.email).toBeNull();
    await page.getByRole('button', { name: 'Actions pour Alicia Exemple', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Modifier', exact: true }).click();
    await expect(firstName).toHaveValue('Alicia');
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await page.getByRole('button', { name: 'Ajouter un proche', exact: true }).click();
    await expect(firstName).toHaveValue('');
    await firstName.fill('Béatrice');
    await page.getByRole('textbox', { name: /^Nom/ }).fill('Exemple');
    await page.getByRole('combobox', { name: /Lien de parenté/ }).click();
    await page.getByRole('option', { name: 'Enfant', exact: true }).click();
    saveFails = true;
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect.poll(() => writes.length).toBe(3);
    await expect(page.getByRole('button', { name: 'Ajouter', exact: true })).toBeEnabled();
    await expect(firstName).toHaveValue('Béatrice');
    saveFails = false;
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Béatrice Exemple', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Actions pour Alicia Exemple', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Supprimer', exact: true }).click();
    const deletion = page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true });
    saveFails = true;
    await deletion.click();
    await expect.poll(() => writes.length).toBe(5);
    await expect(deletion).toBeEnabled();
    saveFails = false;
    await deletion.click();
    await expect(page.getByRole('heading', { name: 'Alicia Exemple', exact: true })).toHaveCount(0);
    expect(writes.map(write => write.method)).toEqual(['PUT', 'PUT', 'POST', 'POST', 'DELETE', 'DELETE']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/patient-relatives-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Prendre un rendez-vous', exact: true }).last().click();
    await expect(page).toHaveURL(/relative_id=relative-b/);
  });
}
