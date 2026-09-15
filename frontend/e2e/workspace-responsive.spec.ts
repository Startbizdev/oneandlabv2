import { test, expect } from '@playwright/test';

// Synthetic data only: this suite must never call a production API.
const roles = ['nurse', 'pro', 'lab', 'subaccount', 'preleveur', 'super_admin'] as const;
for (const role of roles) {
  for (const width of [360, 768, 1440]) {
    test(`${role}: navigation and page fit at ${width}px`, async ({ page }) => {
      const browserErrors: string[] = [];
      page.on('pageerror', error => browserErrors.push(error.message));
      const user = { id: 'ui-fixture', role, first_name: 'Camille', last_name: 'Exemple', email: 'fixture@example.invalid' };
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(({ user, roles }) => {
        localStorage.setItem('auth_token', 'local-ui-fixture');
        localStorage.setItem('auth_user', JSON.stringify(user));
        localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify(Object.fromEntries(roles.map(r => [r, true]))));
      }, { user, roles });
      await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        let data: unknown = [];
        if (path.endsWith('/auth/me')) data = user;
        if (path.includes('plan-limits')) data = { plan_slug: 'discovery', max_radius_km: 20, max_appointments_per_month: 10 };
        await route.fulfill({ json: { success: true, data, user, pagination: { total: 0, page: 1, per_page: 20 }, csrf_token: 'fixture' } });
      });
      const prefix = role === 'super_admin' ? 'admin' : role;
      await page.goto(`/${prefix}/appointments`);
      await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__));
      await expect(page.locator('#workspace-content')).toBeVisible();
      await expect(page.locator('h1').first()).toBeVisible();
      if (width < 768) {
        const menu = page.getByRole('button', { name: 'Ouvrir le menu', exact: true });
        await expect(page.locator('#workspace-navigation')).toBeHidden();
        await menu.click();
        await expect(menu).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('#workspace-navigation')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#workspace-navigation')).toBeHidden();
      } else {
        await expect(page.locator('#workspace-navigation')).toBeVisible();
        const label = page.locator('#workspace-navigation nav a span').last();
        expect(Number.parseFloat(await label.evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(browserErrors).toEqual([]);
      await page.screenshot({ path: `test-results/workspace-${role}-${width}.png`, fullPage: true });
    });
  }
}

for (const width of [360, 768, 1440]) {
  test(`patient: home and mobile navigation at ${width}px`, async ({ page }) => {
    const user = { id: 'ui-patient', role: 'patient', first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ patient: true }));
    }, user);
    await page.route('**/api/**', route => route.fulfill({ json: {
      success: true, user, data: route.request().url().includes('/auth/me') ? user : [],
      pagination: { total: 0, page: 1, limit: 20, pages: 0 }, csrf_token: 'fixture',
    } }));
    await page.goto('/patient');
    await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__));
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nouveau rendez-vous', exact: true })).toBeVisible();
    if (width < 768) {
      await page.getByRole('button', { name: 'Ouvrir le menu', exact: true }).click();
      await expect(page.getByRole('complementary', { name: 'Menu patient' })).toBeVisible();
      await page.getByRole('button', { name: 'Fermer le menu', exact: true }).click();
      await expect(page.getByRole('complementary', { name: 'Menu patient' })).toBeHidden();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/workspace-patient-${width}.png`, fullPage: true });
  });
}

for (const width of [360, 768, 1440]) {
  test(`booking: select and remove a care at ${width}px`, async ({ page }) => {
    const user = { id: 'ui-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
    }, user);
    await page.route('**/api/**', route => route.fulfill({ json: {
      success: true, user, data: route.request().url().includes('/auth/me') ? user : [], csrf_token: 'fixture',
    } }));
    await page.goto('/nurse/appointments/new');
    await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__));
    const add = page.getByRole('button', { name: 'Configurer et ajouter Prélèvement', exact: true });
    await expect(add).toBeVisible();
    const filters = page.getByRole('group', { name: 'Filtrer par catégorie de soins' });
    await filters.getByRole('button', { name: 'Soins', exact: true }).click();
    await expect(add).toBeHidden();
    await filters.getByRole('button', { name: 'Tous', exact: true }).click();
    await expect(add).toBeVisible();
    await add.click();
    const remove = page.getByRole('button', { name: 'Retirer Prélèvement de la sélection', exact: true });
    await expect(remove).toHaveAttribute('aria-pressed', 'true');
    const continueButton = page.getByRole('button', { name: 'Continuer', exact: true });
    await expect(continueButton).toBeVisible();
    await expect.poll(async () => {
      const box = await continueButton.boundingBox();
      return box ? box.y + box.height : Infinity;
    }).toBeLessThanOrEqual(900);
    const rect = await continueButton.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(width < 768 ? 0 : 224);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(width);
    await expect(page.locator('.care-add-flight-ghost, .care-card-add-wisp')).toHaveCount(0);
    await page.screenshot({ path: `test-results/booking-${width}.png`, fullPage: true });
    await remove.click();
    await expect(continueButton).toBeDisabled();
    await expect(add).toHaveAttribute('aria-pressed', 'false');
  });
}
