import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  test(`payment return retries verification without resubmitting payment at ${width}px`, async ({ page }) => {
    const user = { id: 'fixture-patient', role: 'patient', first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ patient: true }));
    }, user);
    let fail = true, checks = 0, writes = 0;
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, async route => {
      const url = new URL(route.request().url());
      if (route.request().method() === 'POST') writes++;
      if (url.pathname.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
      if (url.pathname.endsWith('/booking-draft/status')) {
        checks++;
        expect(url.searchParams.get('session_id')).toBe('fixture-checkout');
        if (fail) await new Promise(resolve => setTimeout(resolve, 2300));
        return route.fulfill({ json: { success: !fail, data: { status: 'completed', appointment_ids: ['fixture-one', 'fixture-two'] } } });
      }
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/rendez-vous/paiement-reussi?session_id=fixture-checkout');
    await expect(page.getByRole('heading', { name: 'Vérification indisponible', exact: true })).toBeVisible();
    expect(checks).toBe(1);
    await expect(page.getByText('Paiement enregistré, création RDV impossible', { exact: true })).toHaveCount(0);
    fail = false;
    await page.getByRole('button', { name: 'Vérifier à nouveau', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Demande enregistrée', exact: true })).toBeVisible();
    expect(checks).toBe(2);
    expect(writes).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page).toHaveURL(/\/patient$/);
  });

  test(`shared batch remains fully readable and retries after failure at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    let fail = true;
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const path = new URL(route.request().url()).pathname;
      if (path.includes('/public/shared-appointment/')) return route.fulfill({ json: { success: !fail, data: {
        appointmentId: 'fixture-one', categoryName: 'Soin', dateShort: '15 septembre 2026', slotLabel: '08:00–10:00', type: 'nursing', status: 'pending', isBatch: true, addressFull: '10 rue Exemple', patientAge: 50,
        careItems: Array.from({ length: 6 }, (_, index) => ({ appointmentId: `fixture-${index}`, categoryName: `Soin ${index + 1}`, dateShort: '15 septembre 2026', slotLabel: '08:00–10:00', durationLabel: '7 jours' })),
      } } });
      return route.fulfill({ json: { success: false, error: 'Non connecté' } });
    });
    await page.goto('/p/rdv/fixture-share');
    await expect(page.getByText('Demande indisponible', { exact: true })).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Plusieurs soins à domicile', exact: true })).toBeVisible();
    await expect(page.getByText('6. Soin 6', { exact: true })).toBeVisible();
    const login = page.getByRole('link', { name: 'Me connecter', exact: true });
    await login.scrollIntoViewIfNeeded();
    await expect(login).toBeInViewport();
    await expect(login).toHaveAttribute('href', '/login?returnTo=/p/rdv/fixture-share');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('meta[name="robots"]').evaluateAll(nodes => nodes.some(node => node.getAttribute('content')?.includes('noindex')))).toBe(true);
  });
}

test('printed QR resolves on the server and preserves professional attribution', async ({ request }) => {
  const response = await request.get('/qr/fixture-qr', { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe('/rendez-vous/nouveau?qr=fixture-qr&assigned_nurse_id=fixture-nurse');
});
