import { test as base } from '@playwright/test';

export * from '@playwright/test';

/**
 * `page.goto` attend l'hydratation Vue (marqueur de `plugins/hydrated-marker.client.ts`) :
 * un clic ou une saisie sur le HTML SSR avant hydratation serait perdu.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await page
        .locator('html[data-hydrated="true"]')
        .waitFor({ state: 'attached', timeout: 20_000 })
        .catch(() => {});
      return response;
    };
    await use(page);
  },
});
