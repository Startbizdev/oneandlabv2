import { test, expect } from '@playwright/test';

for (const width of [360, 768, 1440]) {
  for (const route of ['/', '/pour-les-patients', '/pour-les-infirmiers', '/pour-les-laboratoires', '/pour-les-professionnels', '/contact', '/pour-les-infirmiers/tarifs', '/pour-les-laboratoires/tarifs']) {
    test(`public ${route} fits at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route('**/api/**', request => request.fulfill({ json: { success: true, data: [] } }));
      const errors: string[] = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(route);
      await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      // Contact uses its own metadata; this added route checks the shared hero's layout.
      if (route !== '/contact') await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://cary.bio${route}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `test-results/public-${route === '/' ? 'home' : route.split('/')[1]}-${width}.png`, fullPage: true });
    });
  }
}

test('home: FAQ content and structured answers agree', async ({ page }) => {
  await page.route('**/api/**', request => request.fulfill({ json: { success: true, data: [] } }));
  await page.goto('/');
  const question = page.getByRole('button', { name: 'Est-ce remboursé ?', exact: true });
  await question.click();
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Conditions de déplacement à domicile sur ameli.fr' })).toBeVisible();
  const faq = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent || '{}')).find(item => item['@type'] === 'FAQPage'));
  expect(faq.mainEntity.find((item: any) => item.name === 'Est-ce remboursé ?').acceptedAnswer.text).toContain('La prise en charge dépend');
  await question.click();
  await expect(page.getByRole('link', { name: 'Conditions de déplacement à domicile sur ameli.fr' })).toBeHidden();
});

test('public indexing: sitemap excludes workspaces', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  expect(xml).toContain('<loc>https://cary.bio/</loc>');
  expect(xml).not.toContain('/admin');
  const robots = await request.get('/robots.txt');
  expect(await robots.text()).toContain('Disallow: /patient/');
});
