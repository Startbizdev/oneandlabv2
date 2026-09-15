import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, role: string, blockedStorage = false) {
  const user = { id: 'fixture-onboarding', role, first_name: 'Camille', last_name: 'Exemple' };
  await page.addInitScript(({ user, blockedStorage }) => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    sessionStorage.setItem('nurse_pending_share_link', JSON.stringify({ shareToken: 'fixture-share', openAppointment: 'fixture-appointment', at: Date.now() }));
    if (blockedStorage) {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === 'oneandlab:onboarding-completed') throw new DOMException('Unavailable', 'QuotaExceededError');
        original.call(this, key, value);
      };
    }
  }, { user, blockedStorage });
  await page.route('**/api/**', route => route.fulfill({ json: { success: true, user, data: route.request().url().includes('/auth/me') ? user : [] } }));
}

for (const role of ['patient', 'nurse', 'pro', 'preleveur']) {
  test(`${role}: onboarding navigation, role destination and small viewport`, async ({ page }) => {
    await signIn(page, role);
    await page.setViewportSize({ width: 360, height: 640 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/${role}/onboarding`);
    const firstTitle = await page.getByRole('heading', { level: 1 }).innerText();
    await expect(page.getByRole('status')).toContainText('Étape 1 sur');
    await page.getByRole('button', { name: 'Suivant', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Étape 2 sur');
    await page.getByRole('button', { name: 'Précédent', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(firstTitle);
    while (await page.getByRole('button', { name: 'Suivant', exact: true }).count()) {
      await page.getByRole('button', { name: 'Suivant', exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
    await page.screenshot({ path: `test-results/onboarding-${role}-360.png`, fullPage: true });
    await page.getByRole('button', { name: 'Commencer', exact: true }).click();
    await expect(page).not.toHaveURL(/onboarding/);
    await expect(page).toHaveURL(new RegExp(`/${role}(?:/|\\?|$)`));
    const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('oneandlab:onboarding-completed') || '{}'));
    expect(completed[role]).toBe(true);
    if (role === 'nurse') {
      await expect(page).toHaveURL(/shareToken=fixture-share/);
      expect(await page.evaluate(() => sessionStorage.getItem('nurse_pending_share_link'))).toBeNull();
    } else {
      expect(await page.evaluate(() => sessionStorage.getItem('nurse_pending_share_link'))).not.toBeNull();
    }
  });
}

test('onboarding can finish when persistence is unavailable', async ({ page }) => {
  await signIn(page, 'patient', true);
  await page.goto('/patient/onboarding');
  await page.getByRole('button', { name: 'Passer', exact: true }).click();
  await expect(page).toHaveURL(/\/patient\/?$/);
  await expect(page.getByRole('button', { name: 'Passer', exact: true })).toHaveCount(0);
});
