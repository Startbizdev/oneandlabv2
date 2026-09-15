import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  test(`assistant configuration retains edits after failures at ${width}px`, async ({ page }) => {
    const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
    }, user);
    let failLoad = true, failSave = true;
    const writes: unknown[] = [];
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/me') return route.fulfill({ json: { success: true, data: user, user } });
      if (path === '/api/admin/ai/routing') {
        if (route.request().method() === 'PATCH') {
          writes.push(route.request().postDataJSON());
          return route.fulfill({ json: { success: !failSave, error: failSave ? 'Enregistrement indisponible' : undefined } });
        }
        return route.fulfill({ json: { success: !failLoad, data: [{ task_type: 'summary', provider: 'grok', model: 'existing-model', enabled: '0' }] } });
      }
      if (path === '/api/admin/ai/settings') return route.fulfill({ json: { success: true, data: { disclaimer_fr: 'Message existant', temperature: 0.4 } } });
      if (path === '/api/admin/ai/usage') return route.fulfill({ json: { success: true, data: { totals: { total_calls: 14, total_tokens: 200, total_errors: 0 } } } });
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/admin/ai');
    await expect(page.getByText('Configuration indisponible', { exact: true })).toBeVisible();
    failLoad = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    const model = page.getByRole('textbox', { name: 'Modèle pour summary', exact: true });
    await expect(page.getByRole('checkbox', { name: 'Activer summary', exact: true })).not.toBeChecked();
    await model.fill('updated-model');
    await page.getByRole('row').filter({ has: model }).getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Action non effectuée', { exact: true })).toBeVisible();
    await expect(model).toHaveValue('updated-model');
    failSave = false;
    await page.getByRole('row').filter({ has: model }).getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Configuration enregistrée', { exact: true })).toBeVisible();
    expect(writes).toEqual(Array(2).fill({ task_type: 'summary', provider: 'grok', model: 'updated-model', enabled: false }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
