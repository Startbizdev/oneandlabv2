import { test, expect } from '@playwright/test';

/**
 * Parcours Cary IA booking (mock API) — chat → récap visible.
 * Nécessite un environnement avec session patient mockée ou stub réseau.
 */
test.describe('Cary IA booking', () => {
  test.skip(true, 'Activer quand fixture auth patient + mock /ai/chat/stream disponible');

  test('affiche une réponse assistant après message booking', async ({ page }) => {
    await page.route('**/api/ai/chat/stream', async (route) => {
      const body = [
        'event: start\ndata: {"ok":true}\n\n',
        'event: delta\ndata: {"text":"Parfait, je note votre pansement pour demain."}\n\n',
        'event: done\ndata: {"message":{"content":"Parfait, je note votre pansement pour demain."},"draft":{"status":"collecting"}}\n\n',
        'event: end\ndata: {}\n\n',
      ].join('');
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body,
      });
    });

    await page.goto('/patient');
    await expect(page.getByText(/pansement/i)).toBeVisible({ timeout: 5000 });
  });
});
