import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  for (const directory of ['infirmiers', 'laboratoires']) {
    test(`${directory}: city search and clear at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route('**/api/**', route => {
        const city = new URL(route.request().url()).searchParams.get('city');
        return route.fulfill({ json: { success: true, data: [{ id: 'search', slug: 'search', name: city ? 'Résultat Lyon' : 'Tous les professionnels' }], pagination: { page: 1, pages: 1 } } });
      });
      await page.goto(`/${directory}`);
      await page.getByLabel('Dans quelle ville ?').fill('Lyon');
      await page.getByRole('button', { name: 'Rechercher les professionnels' }).click();
      await expect(page.getByText('Résultat Lyon', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Effacer le filtre « Lyon »' }).click();
      await expect(page.getByText('Tous les professionnels', { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/directory-${directory}-${width}.png`, fullPage: true });
    });
  }

  test(`public booking: empty and filled dock at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/**', route => route.fulfill({ json: { success: true, data: [] } }));
    await page.goto('/rendez-vous/nouveau');
    const next = page.getByRole('button', { name: 'Continuer', exact: true });
    await expect(next).toBeDisabled();
    await page.getByRole('button', { name: 'Configurer et ajouter Prélèvement', exact: true }).click();
    await expect(next).toBeEnabled();
    const cart = page.getByRole('button', { name: /Ouvrir le détail du panier/ });
    await cart.click();
    await expect(page.getByRole('heading', { name: 'Votre soin', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Fermer', exact: true }).first().click();
    await expect(cart).toBeFocused();
    expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(48);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/public-booking-dock-${width}.png`, fullPage: true });
    await next.click();
    await expect(page.getByRole('heading', { name: 'Choix du laboratoire' })).toBeVisible();
  });
}
