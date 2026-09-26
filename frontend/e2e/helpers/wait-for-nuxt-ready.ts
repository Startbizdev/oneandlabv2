import { expect, type Page } from '@playwright/test';

/** Nuxt 3 n'expose plus `#__nuxt.__vue_app__` — attendre le shell UI réel. */
export async function waitForNuxtReady(page: Page, timeout = 60_000) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('#__nuxt')).toBeAttached({ timeout });
  const shell = page.locator('main, h1').first();
  await expect(shell).toBeVisible({ timeout });
}
