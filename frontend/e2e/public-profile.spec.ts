import { test, expect } from '@playwright/test';

// Uses the same synthetic SSR API as public-directory.spec.ts.
for (const path of ['/infirmier', '/Laboratoire', '/professionnel']) {
  test(`${path}: server HTML contains the profile and canonical URL`, async ({ request }) => {
    const response = await request.get(`${path}/fixture-profile?campaign=fixture`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('Camille Exemple');
    expect(html).toContain(`href="https://cary.bio${path}/fixture-profile"`);
    expect(html).toContain('public-profile-entity');
    expect(html).not.toContain('[object Object]');
  });

  test(`${path}: public profile fits on a narrow phone`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => route.fulfill({ json: { success: true, data: [] } }));
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${path}/fixture-profile`);
    await expect(page.getByRole('heading', { level: 1, name: 'Camille Exemple' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Réserver une visite', exact: true }).first()).toHaveAttribute('href', /provider_id=fixture-profile/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    if (path !== '/professionnel') {
      await expect(page.locator('[class*="syringe"]').first()).toBeVisible();
      await expect(page.locator('img[src="/api/old-care.png"]')).toHaveCount(0);
    }
    await page.screenshot({ path: `test-results/public-profile-${path.slice(1)}-360.png`, fullPage: true });
  });

  test(`${path}: missing profile returns 404 and old slug redirects`, async ({ request }) => {
    expect((await request.get(`${path}/fixture-missing`)).status()).toBe(404);
    const moved = await request.get(`${path}/fixture-old`, { maxRedirects: 0 });
    expect(moved.status()).toBe(301);
    expect(moved.headers().location).toBe(`${path}/fixture-profile`);
  });
}

test('patient: public review uses own history and retains text after failed submission', async ({ page }) => {
  const user = { id: 'fixture-patient', role: 'patient', first_name: 'Louise', last_name: 'Exemple' };
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, user);
  let attempts = 0;
  let historyScoped = false;
  await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
    if (url.pathname === '/api/appointments') return route.fulfill({ json: { success: true, data: [{ id: 'fixture-completed', status: 'completed', assigned_nurse_id: 'fixture-profile', scheduled_at: '2026-09-15 09:00:00' }] } });
    if (url.pathname === '/api/reviews' && route.request().method() === 'GET') {
      historyScoped = url.searchParams.get('patient_id') === user.id;
      return route.fulfill({ json: { success: true, data: [] } });
    }
    if (url.pathname === '/api/reviews' && route.request().method() === 'POST') {
      attempts++;
      expect(route.request().postDataJSON()).toMatchObject({ appointment_id: 'fixture-completed', rating: 4, comment: 'Suivi clair et ponctuel.' });
      return route.fulfill({ json: attempts === 1 ? { success: false, error: 'Enregistrement temporairement indisponible' } : { success: true } });
    }
    if (url.pathname === '/api/public/nurse/fixture-profile') return route.fulfill({ json: { success: true, data: { id: 'fixture-profile', first_name: 'Camille', last_name: 'Exemple', reviews: { stats: { total_reviews: 0, average_rating: 0 }, items: [] } } } });
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.goto('/infirmier/fixture-profile');
  await page.getByRole('button', { name: 'Laisser un avis', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Laisser un avis', exact: true });
  await dialog.getByRole('button', { name: '4 sur 5', exact: true }).click();
  const comment = dialog.getByRole('textbox', { name: 'Commentaire (optionnel)' });
  await comment.fill('Suivi clair et ponctuel.');
  await dialog.getByRole('button', { name: "Envoyer l'avis", exact: true }).click();
  await expect(page.getByText('Enregistrement temporairement indisponible', { exact: true })).toBeVisible();
  await expect(comment).toHaveValue('Suivi clair et ponctuel.');
  await dialog.getByRole('button', { name: "Envoyer l'avis", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(historyScoped).toBe(true);
  expect(attempts).toBe(2);
});
