import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  test(`registration requests recover after a failed load at ${width}px`, async ({ page }) => {
    const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
    }, user);
    let fail = true;
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
      if (path === '/api/registration-requests') return route.fulfill({ json: { success: !fail, data: [{ id: 'fixture-request', first_name: 'Louise', last_name: 'Exemple', email: 'louise@example.invalid', status: 'pending', role: 'nurse', address: { label: '10 rue Exemple' }, created_at: '2026-09-15 08:00:00' }] } });
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/admin/inscriptions');
    await expect(page.getByRole('heading', { name: 'Inscriptions indisponibles', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Aucune demande', exact: true })).not.toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Louise Exemple', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accepter', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`notification editor retains its draft and loads all recipients at ${width}px`, async ({ page }) => {
    const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
    }, user);
    let failHistory = true, failUsers = true;
    let sends = 0;
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
      if (url.pathname.endsWith('/notifications/sent')) return route.fulfill({ json: { success: !failHistory, data: [] } });
      if (url.pathname === '/api/users') {
        const second = url.searchParams.get('page') === '2';
        return route.fulfill({ json: { success: !(second && failUsers), data: [{ id: second ? 'two' : 'one', first_name: second ? 'Louise' : 'Camille', last_name: 'Exemple', role: 'nurse' }], pagination: { pages: 2 } } });
      }
      if (url.pathname.endsWith('/notifications/send')) {
        sends++;
        return route.fulfill({ json: { success: false, error: 'Envoi indisponible' } });
      }
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/admin/notifications');
    await expect(page.getByText('Historique indisponible', { exact: true })).toBeVisible();
    failHistory = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByText('Aucune notification envoyée', { exact: true })).toBeVisible();
    await page.getByRole('textbox', { name: /^Titre\*?$/ }).fill('Message fictif');
    await page.getByRole('textbox', { name: /^Message\*?$/ }).fill('Contenu à conserver');
    await page.getByRole('radio', { name: 'Utilisateurs spécifiques', exact: true }).check();
    await page.getByRole('button', { name: 'Sélectionner des utilisateurs', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Destinataires indisponibles. Votre sélection est conservée.', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Valider', exact: true })).toBeDisabled();
    failUsers = false;
    await dialog.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await dialog.getByRole('checkbox', { name: 'Sélectionner Louise Exemple', exact: true }).check();
    await dialog.getByRole('button', { name: 'Valider', exact: true }).click();
    await page.getByRole('button', { name: 'Envoyer la notification', exact: true }).click();
    await expect(page.getByText('Envoi indisponible', { exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /^Message\*?$/ })).toHaveValue('Contenu à conserver');
    expect(sends).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
