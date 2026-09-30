import { test, expect } from './fixtures/test';

const LAB_OK = { id: 'lab-alpha-centre', company_name: 'Labo Alpha Centre', email: 'centre@alpha.test' };
const LAB_SUGGESTED = { id: 'lab-alpha-sud', company_name: 'Labo Alpha Sud', email: 'sud@alpha.test' };
const LAB_NO_ZONE = { id: 'lab-beta-nord', company_name: 'Labo Beta Nord', email: 'nord@beta.test' };

for (const width of [360, 1440]) {
  test(`lab brands: real lab status, blocked-lab warning, reorder and delete at ${width}px`, async ({ page }) => {
    const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
    }, user);

    let brands = [
      { id: 'brand-alpha', name: 'Alpha', slug: 'alpha', logo_url: null, website_url: null, is_active: 1, sort_order: 1, lab_ids: [LAB_OK.id], appointment_count: 0 },
      { id: 'brand-beta', name: 'Beta', slug: 'beta', logo_url: null, website_url: null, is_active: 1, sort_order: 2, lab_ids: [LAB_NO_ZONE.id], appointment_count: 3 },
    ];
    const reachability = [
      { id: LAB_OK.id, has_active_zone: true, is_accepting_appointments: true },
      { id: LAB_SUGGESTED.id, has_active_zone: true, is_accepting_appointments: true },
      { id: LAB_NO_ZONE.id, has_active_zone: false, is_accepting_appointments: true },
    ];
    const writes: { method: string; path: string; body: unknown }[] = [];

    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const method = request.method();
      if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
      if (path.endsWith('/users')) {
        return route.fulfill({ json: { success: true, data: [LAB_OK, LAB_SUGGESTED, LAB_NO_ZONE], pagination: { page: 1, pages: 1 } } });
      }
      if (path.endsWith('/admin/lab-brands/labs')) return route.fulfill({ json: { success: true, data: reachability } });
      if (path.endsWith('/admin/lab-brands/reorder') && method === 'POST') {
        const body = request.postDataJSON() as { ids: string[] };
        writes.push({ method, path, body });
        brands = body.ids.map((id, index) => ({ ...brands.find(brand => brand.id === id)!, sort_order: index + 1 }));
        return route.fulfill({ json: { success: true, data: brands } });
      }
      const idMatch = path.match(/\/admin\/lab-brands\/([^/]+)$/);
      if (idMatch && (method === 'PUT' || method === 'DELETE')) {
        const body = method === 'PUT' ? request.postDataJSON() : null;
        writes.push({ method, path, body });
        if (method === 'DELETE') brands = brands.filter(brand => brand.id !== idMatch[1]);
        else brands = brands.map(brand => (brand.id === idMatch[1] ? { ...brand, ...body } : brand));
        return route.fulfill({ json: { success: true } });
      }
      if (path.endsWith('/admin/lab-brands')) return route.fulfill({ json: { success: true, data: brands } });
      return route.fulfill({ json: { success: true, data: [] } });
    });

    await page.goto('/admin/lab-brands');

    const alphaStatus = page.getByTestId('brand-labs-alpha').filter({ visible: true });
    await expect(alphaStatus).toContainText('1 labo reçoit les RDV');
    await expect(alphaStatus).toContainText('Labo Alpha Centre');
    const betaStatus = page.getByTestId('brand-labs-beta').filter({ visible: true });
    await expect(betaStatus).toContainText('Aucun labo ne peut recevoir : RDV traités par l’administration');
    await expect(betaStatus).toContainText('Labo Beta Nord : aucune zone de prise de sang active');

    await page.getByRole('button', { name: 'Descendre Alpha', exact: true }).click();
    await expect.poll(() => writes.filter(write => write.path.endsWith('/reorder')).map(write => write.body)).toEqual([{ ids: ['brand-beta', 'brand-alpha'] }]);
    await expect(page.getByRole('button', { name: 'Monter Beta', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Descendre Alpha', exact: true })).toBeDisabled();

    await page.getByRole('button', { name: 'Modifier Alpha', exact: true }).click();
    const alphaDialog = page.getByRole('dialog');
    await expect(alphaDialog.getByRole('button', { name: 'Ajouter Labo Alpha Sud', exact: true })).toBeVisible();
    await alphaDialog.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(alphaDialog).toBeHidden();

    await page.getByRole('button', { name: 'Modifier Beta', exact: true }).click();
    const betaDialog = page.getByRole('dialog');
    await betaDialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(betaDialog.getByText('Certains labos ne recevront aucun RDV', { exact: true })).toBeVisible();
    expect(writes.filter(write => write.method === 'PUT')).toHaveLength(0);
    await betaDialog.getByRole('button', { name: 'Enregistrer quand même', exact: true }).click();
    await expect(betaDialog).toBeHidden();
    const put = writes.find(write => write.method === 'PUT');
    expect(put?.path).toMatch(/\/admin\/lab-brands\/brand-beta$/);
    expect(put?.body).toMatchObject({ name: 'Beta', lab_ids: [LAB_NO_ZONE.id], is_active: 1 });
    expect(put?.body).not.toHaveProperty('sort_order');

    await page.getByRole('button', { name: 'Supprimer Beta', exact: true }).click();
    const deleteDialog = page.getByRole('dialog');
    await expect(deleteDialog.getByRole('heading', { name: 'Supprimer « Beta » ?' })).toBeVisible();
    await expect(deleteDialog).toContainText('3 rendez-vous ont choisi ce réseau');
    await expect(deleteDialog.getByRole('button', { name: 'Masquer plutôt', exact: true })).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'Supprimer', exact: true }).click();
    await expect(deleteDialog).toBeHidden();
    expect(writes.filter(write => write.method === 'DELETE').map(write => write.path)).toEqual([expect.stringMatching(/\/admin\/lab-brands\/brand-beta$/)]);
    await expect(page.getByRole('button', { name: 'Modifier Beta', exact: true })).toHaveCount(0);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
