import { test, expect } from '@playwright/test';

for (const width of [360, 768]) {
  test(`public menu: focus, scroll, navigation and resize at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 640 });
    await page.route('**/api/**', route => route.fulfill({ json: { success: true, data: [] } }));
    await page.goto('/');
    await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__));
    const trigger = page.getByRole('button', { name: 'Ouvrir le menu', exact: true });
    const dialog = page.getByRole('dialog', { name: 'Explorer Cary' });
    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Fermer le menu', exact: true })).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Shift+Tab');
    // Native dialogs may move focus to browser chrome at the edge, never to the page behind.
    await trigger.evaluate(el => el.focus());
    await expect(trigger).not.toBeFocused();
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await trigger.click();
    await dialog.locator('summary').filter({ hasText: 'Laboratoires' }).click();
    await dialog.getByRole('link', { name: 'Tarifs', exact: true }).click();
    await expect(page).toHaveURL(/pour-les-laboratoires\/tarifs/);
    await expect(dialog).toBeHidden();
    await trigger.click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    const nav = page.getByRole('navigation', { name: 'Navigation principale', exact: true });
    await nav.getByRole('button', { name: 'Infirmiers', exact: true }).click();
    await expect(page.getByRole('link', { name: 'Pourquoi Cary', exact: true }).filter({ visible: true })).toBeVisible();
  });
}
