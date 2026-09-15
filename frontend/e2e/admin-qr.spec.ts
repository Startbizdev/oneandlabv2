import { test, expect } from '@playwright/test';

test('admin QR list retries, searches beyond the first 100 profiles and downloads with authentication', async ({ page }) => {
  const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
  await page.setViewportSize({ width: 360, height: 1000 });
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
  }, user);
  let unavailable = true;
  let authorizedDownload = false;
  const offsets: number[] = [];
  await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
    if (url.pathname.endsWith('/png')) {
      authorizedDownload = route.request().headers().authorization === 'Bearer local-ui-fixture';
      return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=', 'base64') });
    }
    if (url.pathname === '/api/admin/qr') {
      if (unavailable) return route.fulfill({ json: { success: false, error: 'Indisponible' } });
      const offset = Number(url.searchParams.get('offset'));
      offsets.push(offset);
      const row = (n: number) => ({ profile_id: `profile-${n}`, display_name: n === 100 ? 'Dernier professionnel' : `Professionnel ${n}`, token: `fixture-token-${n}`, user_role: 'nurse', analytics: { scans: 12, visits: 8, conversions: 3 } });
      return route.fulfill({ json: { success: true, data: { total: 101, items: offset === 0 ? Array.from({ length: 100 }, (_, n) => row(n)) : [row(100)] } } });
    }
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.goto('/admin/qr-code');
  await expect(page.getByRole('alert')).toContainText('La liste des QR codes est indisponible');
  unavailable = false;
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await page.getByPlaceholder('Rechercher par nom ou token…').fill('Dernier professionnel');
  await expect(page.getByText('Dernier professionnel', { exact: true })).toBeVisible();
  expect(offsets).toEqual([0, 100]);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'QR brut', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('cary-qr-profile-100.png');
  expect(authorizedDownload).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
