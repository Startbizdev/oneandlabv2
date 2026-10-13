import { test, expect } from './fixtures/test';

// Run with `npm run test:e2e:ssr` (production build + fixtures/public-api-server.cjs).
for (const [directory, endpoint] of [['infirmiers', 'nurses'], ['laboratoires', 'labs']]) {
  test(`${directory}: national directory shares server rendering and page navigation`, async ({ request, page }) => {
    const response = await request.get(`/${directory}`);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Camille Exemple');
    await page.setViewportSize({ width: 360, height: 900 });
    await page.route(`**/api/public/${endpoint}?**`, route => route.fulfill({ json: { success: false, error: 'Annuaire indisponible' } }));
    await page.goto(`/${directory}`);
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://cary.bio/${directory}`);
    await page.getByRole('button', { name: 'Suivant', exact: true }).click();
    await expect(page.getByText('Annuaire indisponible', { exact: true })).toBeVisible();
    await page.route(`**/api/public/${endpoint}?**`, route => route.fulfill({ json: { success: true, data: [{ id: 'second', slug: 'second', name: 'Louise Exemple' }], pagination: { page: 2, pages: 2 } } }));
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByText('Louise Exemple', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

for (const [cityBase, oldCityPath, endpoint, screenshotKey] of [
  ['infirmier/ville', 'infirmiers/ville', 'nurses', 'infirmiers'],
  ['laboratoire/ville', 'laboratoires/ville', 'labs', 'laboratoires'],
] as const) {
  test(`${cityBase}: public profiles are present in server HTML`, async ({ request }) => {
    const response = await request.get(`/${cityBase}/paris`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('Camille Exemple');
    expect(html).toContain(`https://cary.bio/${cityBase}/paris`);
  });

  test(`${oldCityPath}: old city URL redirects to ${cityBase}`, async ({ request }) => {
    const moved = await request.get(`/${oldCityPath}/paris`, { maxRedirects: 0 });
    expect(moved.status()).toBe(301);
    expect(moved.headers().location).toBe(`/${cityBase}/paris`);
  });

  test(`${cityBase}: page two is reachable`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await page.route(`**/api/public/${endpoint}?**`, route => {
      expect(new URL(route.request().url()).searchParams.get('page')).toBe('2');
      return route.fulfill({ json: { success: true, data: [{ id: 'fixture-second', slug: 'fixture-second', name: 'Louise Exemple', city: 'Paris' }], pagination: { page: 2, pages: 2 } } });
    });
    await page.goto(`/${cityBase}/paris`);
    await page.getByRole('button', { name: 'Suivant', exact: true }).click();
    await expect(page.getByText('Louise Exemple', { exact: true })).toBeVisible();
    await expect(page.getByText('Camille Exemple', { exact: true })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Suivant', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/${screenshotKey}-city-360.png`, fullPage: true });
  });

  test(`${cityBase}: unavailable service returns 503 and can retry`, async ({ page }) => {
    await page.route(`**/api/public/${endpoint}?**`, route => route.fulfill({ json: { success: true, data: [{ id: 'fixture-retry', slug: 'fixture-retry', name: 'Louise Exemple' }] } }));
    const response = await page.goto(`/${cityBase}/fixture-error`);
    expect(response?.status()).toBe(503);
    await expect(page.getByText('Impossible de charger les professionnels')).toBeVisible();
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByText('Louise Exemple', { exact: true })).toBeVisible();
  });

  test(`${cityBase}: empty city returns 404`, async ({ request }) => {
    const response = await request.get(`/${cityBase}/ville-inexistante-xyz`);
    expect(response.status()).toBe(404);
  });
}
