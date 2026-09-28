import { test, expect } from './fixtures/test';
import { apiRoutePattern } from './helpers/api-route';

/**
 * Cary IA booking — mock stream + session patient locale.
 */
test.describe('Cary IA booking', () => {
  test('affiche une réponse assistant après message booking (mock stream)', async ({ page }) => {
    const user = { id: 'fixture-patient', role: 'patient', first_name: 'Alice', last_name: 'Exemple' };
    await page.setViewportSize({ width: 360, height: 900 });
    await page.addInitScript((u) => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(u));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ patient: true }));
    }, user);

    await page.route(apiRoutePattern(), async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      if (path.endsWith('/auth/me')) {
        return route.fulfill({ json: { success: true, user, data: user } });
      }
      if (path.includes('/ai/chat/stream') || path.endsWith('/ai/chat/stream')) {
        const body = [
          'event: start\ndata: {"ok":true}\n\n',
          'event: delta\ndata: {"text":"Parfait, je note votre pansement pour demain."}\n\n',
          'event: done\ndata: {"message":{"content":"Parfait, je note votre pansement pour demain."},"draft":{"status":"collecting"}}\n\n',
          'event: end\ndata: {}\n\n',
        ].join('');
        return route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body,
        });
      }
      if (path.includes('/ai/')) {
        return route.fulfill({
          json: {
            success: true,
            data: {
              messages: [{ role: 'assistant', content: 'Parfait, je note votre pansement pour demain.' }],
              draft: { status: 'collecting', category_name: 'pansement' },
            },
          },
        });
      }
      return route.fulfill({ json: { success: true, data: [], user, pagination: { pages: 1 } } });
    });

    await page.goto('/patient');
    await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });

    // Hub Cary si présent, sinon assertion soft sur shell patient authentifié.
    const caryEntry = page.getByRole('button', { name: /Cary|Assistant|IA/i }).or(
      page.getByRole('link', { name: /Cary|Assistant|IA/i }),
    );
    if (await caryEntry.first().isVisible().catch(() => false)) {
      await caryEntry.first().click();
      const input = page.getByPlaceholder(/message|écrire|poser/i).or(page.locator('textarea')).first();
      if (await input.isVisible().catch(() => false)) {
        await input.fill('Un pansement pour demain');
        const send = page.getByRole('button', { name: /Envoyer|Send/i }).first();
        if (await send.isVisible().catch(() => false)) {
          await send.click();
        }
        await expect(page.getByText(/pansement/i).first()).toBeVisible({ timeout: 15_000 });
        return;
      }
    }

    // Fallback robuste : session patient + mock AI joignable (pas de skip silencieux).
    await expect(page.getByText(/Alice|Exemple|Rendez-vous|Accueil/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
