import { expect, type Page } from '@playwright/test';

/** Attend que Vue ait hydraté la page (marqueur posé par `plugins/hydrated-marker.client.ts`). */
export async function waitForHydration(page: Page, timeout = 60_000) {
  await expect(page.locator('html[data-hydrated="true"]')).toBeAttached({ timeout });
}

/** Nuxt 3 n'expose plus `#__nuxt.__vue_app__` — attendre le shell UI réel puis l'hydratation. */
export async function waitForNuxtReady(page: Page, timeout = 60_000) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('#__nuxt')).toBeAttached({ timeout });
  const shell = page.locator('main, h1').first();
  await expect(shell).toBeVisible({ timeout });
  await waitForHydration(page, timeout);
}
