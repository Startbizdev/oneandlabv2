import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  test(`notification selection survives list and recipient failures at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
    }, user);
    let failList = true, failRecipients = true;
    let sends = 0;
    const recipientPages: string[] = [];
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/auth/me') return route.fulfill({ json: { success: true, data: user, user } });
      if (url.pathname === '/api/admin/dispatch') return route.fulfill({ json: {
        success: !failList,
        data: { rows: [{ id: 'fixture-rdv', type: 'nursing', status: 'confirmed', patient_display_name: 'Patient Exemple', creneau: JSON.stringify({ type: 'custom', range: [8, 10] }) }], pagination: { page: 1, total_pages: 1, total: 1 } },
      } });
      if (url.pathname === '/api/users') {
        const role = url.searchParams.get('role')!;
        const current = url.searchParams.get('page')!;
        recipientPages.push(`${role}:${current}`);
        if (role === 'nurse' && current === '2' && failRecipients) return route.fulfill({ json: { success: false } });
        return route.fulfill({ json: { success: true, data: [{ id: `${role}-${current}`, first_name: `${role} ${current}`, role }], pagination: { pages: role === 'nurse' ? 2 : 1 } } });
      }
      if (url.pathname.endsWith('/notifications/resend')) {
        sends++;
        return route.fulfill({ json: { success: true, data: { sent: 1 } } });
      }
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/admin/appointments/notifications?appointment_id=fixture-rdv');
    await expect(page.getByText('Rendez-vous indisponibles', { exact: true })).toBeVisible();
    await expect(page.getByText('Aucun rendez-vous', { exact: true })).not.toBeVisible();
    failList = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByRole('checkbox')).toBeChecked();
    await expect(page.getByText('Confirmé', { exact: true })).toBeVisible();
    await expect(page.getByText('Soins infirmiers · 8h00 - 10h00', { exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: "Type d'email", exact: true }).click();
    await page.getByRole('option', { name: 'Nouvelle demande (pro/infirmier/labo)', exact: true }).click();
    await expect(page.getByText('Impossible de charger tous les destinataires. Votre sélection est conservée.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Renvoyer', exact: true })).toBeDisabled();
    failRecipients = false;
    await page.getByRole('button', { name: 'Recharger les destinataires', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Renvoyer', exact: true })).toBeEnabled();
    expect(recipientPages.filter(value => value === 'nurse:2')).toHaveLength(2);
    expect(sends).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
