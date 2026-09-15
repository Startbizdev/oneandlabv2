import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  for (const kind of ['brands', 'categories']) {
    test(`${kind}: failed catalog edits preserve visibility and values at ${width}px`, async ({ page }) => {
      const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(user => {
        localStorage.setItem('auth_token', 'local-ui-fixture');
        localStorage.setItem('auth_user', JSON.stringify(user));
        localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
      }, user);
      let failLoad = true, failWrite = true;
      const writes: any[] = [];
      const row = { id: 'fixture-catalog', name: 'Exemple', slug: 'exemple', is_active: '0', sort_order: 1, type: 'nursing', options: [] };
      const endpoint = kind === 'brands' ? '/api/admin/lab-brands' : '/api/categories';
      await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
        const path = new URL(route.request().url()).pathname;
        if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
        if (path.startsWith(endpoint)) {
          if (route.request().method() === 'PUT') {
            const body = route.request().postDataJSON();
            writes.push(body);
            if (!failWrite) Object.assign(row, body);
            return route.fulfill({ json: { success: !failWrite, error: failWrite ? 'Enregistrement indisponible' : undefined } });
          }
          return route.fulfill({ json: { success: !failLoad, data: [row] } });
        }
        return route.fulfill({ json: { success: true, data: [] } });
      });
      await page.goto(kind === 'brands' ? '/admin/lab-brands' : '/admin/categories');
      await expect(page.getByRole('heading', { name: kind === 'brands' ? 'Marques indisponibles' : 'Catégories indisponibles', exact: true })).toBeVisible();
      failLoad = false;
      await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
      const toggle = page.getByRole('switch', { name: 'Activer Exemple', exact: true });
      await expect(toggle).not.toBeChecked();
      await toggle.click();
      await expect.poll(() => writes.length).toBe(1);
      await expect(toggle).not.toBeChecked();
      failWrite = false;
      await toggle.click();
      await expect(toggle).toBeChecked();
      expect(writes.map(body => Number(body.is_active))).toEqual([1, 1]);
      if (kind === 'brands') {
        failWrite = true;
        await page.getByRole('button', { name: 'Modifier Exemple', exact: true }).click();
        const dialog = page.getByRole('dialog');
        const name = dialog.getByRole('textbox', { name: /^Nom\*?$/ });
        await name.fill('Réseau Exemple');
        await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
        await expect(dialog.getByText('Enregistrement indisponible', { exact: true })).toBeVisible();
        await expect(name).toHaveValue('Réseau Exemple');
        failWrite = false;
        await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
        await expect(dialog).toBeHidden();
        await expect(page.getByText('Réseau Exemple', { exact: true })).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}
