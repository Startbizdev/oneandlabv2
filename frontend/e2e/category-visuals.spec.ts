import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page, admin: boolean, image = false) {
  const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
  if (admin) await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
  }, user);
  const category = { id: 'fixture-care', name: 'Soin personnalisé', type: 'blood_test', icon: image ? null : 'syringe', is_active: 1, options: [], image_url: '/api/fixture-care.svg' };
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (url.searchParams.has('category_options_for')) return route.fulfill({ json: { success: true, data: [] } });
    if (path.startsWith('/api/categories') && route.request().method() === 'PUT') Object.assign(category, route.request().postDataJSON());
    if (path === '/api/fixture-care.svg') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><circle cx="24" cy="24" r="20" fill="#1CC7B5"/></svg>' });
    return route.fulfill({ json: { success: true, user, data: path.endsWith('/auth/me') ? user : path.startsWith('/api/categories') ? [category] : [], pagination: { pages: 1 } } });
  });
}

for (const width of [360, 1440]) {
  for (const admin of [true, false]) {
    for (const image of [false, true]) {
      test(`${admin ? 'admin' : 'patient'} selected care ${image ? 'image' : 'icon'} survives cart and calendar at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 1000 });
        await setup(page, admin, image);
        await page.goto(admin ? '/admin/appointments/new' : '/rendez-vous/nouveau');
        const visual = image ? 'img[src="/api/fixture-care.svg"]' : '[class*="syringe"]';
        const add = page.getByRole('button', { name: 'Configurer et ajouter Soin personnalisé', exact: true });
        await expect(add.locator('xpath=ancestor::li').locator(visual)).toBeVisible();
        await add.click();
        await page.getByRole('button', { name: 'Valider et ajouter', exact: true }).click();
        const next = page.getByRole('button', { name: 'Continuer', exact: true });
        await page.getByRole('button', { name: /Ouvrir le détail du panier/ }).click();
        await expect(page.getByRole('dialog').last().locator(visual)).toBeVisible();
        await page.getByRole('button', { name: 'Fermer', exact: true }).first().click();
        const spacing = await next.evaluate(el => {
          const dock = el.parentElement!;
          const bounds = dock.getBoundingClientRect();
          const button = el.getBoundingClientRect();
          return { padding: parseFloat(getComputedStyle(dock).paddingRight), gap: bounds.right - button.right, left: bounds.left, right: bounds.right };
        });
        expect(spacing.padding).toBeGreaterThanOrEqual(12);
        expect(spacing.gap).toBeGreaterThanOrEqual(12);
        expect(spacing.left).toBeGreaterThanOrEqual(admin && width >= 768 ? 224 : 0);
        expect(spacing.right).toBeLessThanOrEqual(width);
        await next.click();
        await next.click();
        await expect(page.locator('.booking-date-carousel').first()).toBeVisible();
        await expect(page.locator(visual).filter({ visible: true }).first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (admin && !image) await page.screenshot({ path: `test-results/admin-booking-icons-${width}.png`, fullPage: true });
      });
    }
  }
  test(`category add and edit show the saved pictogram and usable modal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page, true);
    await page.goto('/admin/categories');
    await expect(page.locator('[class*="syringe"]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Modifier', exact: true }).click();
    const dialog = page.getByRole('dialog').last();
    await expect(dialog.getByRole('heading', { name: 'Modifier le soin' })).toBeVisible();
    await expect(dialog.locator('[class*="syringe"]').first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Enregistrer', exact: true })).toBeInViewport();
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `test-results/category-editor-${width}.png`, fullPage: true, animations: 'disabled' });
    await dialog.getByRole('button', { name: 'Show popup', exact: true }).click();
    await page.getByRole('option', { name: 'Lucide · Bandage', exact: true }).click();
    await expect(dialog.locator('[class*="bandage"]').first()).toBeVisible();
    await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[class*="bandage"]').first()).toBeVisible();
    await page.getByRole('button', { name: 'Nouvelle catégorie', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Ajouter un soin' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Créer', exact: true })).toBeInViewport();
  });
}

test('nurse care preferences retain the admin icon when toggled', async ({ page }) => {
  const user = { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple', email: 'fixture@example.invalid' };
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
  }, user);
  const preference = { category_id: 'fixture-care', name: 'Soin personnalisé', icon: 'syringe', is_enabled: false };
  let updates = 0;
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/nurse-category-preferences') {
      if (route.request().method() !== 'GET') { updates++; preference.is_enabled = true; }
      return route.fulfill({ json: { success: true, data: [preference] } });
    }
    return route.fulfill({ json: { success: true, user, data: path.includes('/users/') || path.endsWith('/auth/me') ? user : [] } });
  });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto('/profile');
  const care = page.getByRole('button', { name: /Soin personnalisé/ });
  await expect(care.locator('[class*="syringe"]')).toBeVisible();
  await care.click();
  await expect.poll(() => updates).toBe(1);
  await expect(care.locator('[class*="syringe"]')).toBeVisible();
  await expect(care.getByRole('switch')).toBeChecked();
});
