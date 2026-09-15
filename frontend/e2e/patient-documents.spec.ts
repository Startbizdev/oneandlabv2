import { test, expect } from '@playwright/test';

test('patient document library: upload dialog, authenticated upload and confirmed deletion', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  const user = { id: 'fixture-patient', role: 'patient', first_name: 'Camille', last_name: 'Exemple' };
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ patient: true }));
  }, user);
  let uploaded = false;
  let deleted = false;
  let posts = 0;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => {
    const request = route.request();
    const url = new URL(request.url());
    let data: unknown = [];
    if (url.pathname.endsWith('/auth/me')) data = user;
    if (url.pathname.includes('csrf')) data = { csrf_token: 'fixture-csrf' };
    if (url.pathname === '/api/medical-documents' && request.method() === 'GET') {
      data = [
        { id: 'nurse-document', file_name: 'Résultats du laboratoire.pdf', document_type: 'resultats', created_at: '2026-09-15', can_delete: false },
        ...(uploaded && !deleted ? [{ id: 'own-document', file_name: 'Ordonnance.pdf', document_type: 'ordonnance', created_at: '2026-09-15', can_delete: true }] : []),
      ];
    }
    if (url.pathname === '/api/medical-documents' && request.method() === 'POST') {
      expect(request.headers().authorization).toBe('Bearer local-ui-fixture');
      expect(request.postDataBuffer()?.toString()).toContain('ordonnance');
      uploaded = true;
      posts++;
    }
    if (url.pathname === '/api/medical-documents/own-document' && request.method() === 'DELETE') deleted = true;
    return route.fulfill({ json: { success: true, user, data } });
  });
  await page.goto('/patient/documents');
  await expect(page.getByText('Résultats du laboratoire.pdf', { exact: true })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Supprimer', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ajouter un document', exact: true }).click();
  const upload = page.getByRole('dialog', { name: 'Ajouter un document', exact: true });
  await expect(upload).toBeVisible();
  await upload.locator('input[type=file]').setInputFiles({ name: 'Ordonnance.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nLocal synthetic fixture\n%%EOF') });
  await upload.getByRole('button', { name: 'Envoyer', exact: true }).click();
  await expect(upload).toBeHidden();
  await expect(page.getByText('Ordonnance.pdf', { exact: true })).toBeVisible();
  expect(posts).toBe(1);
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Supprimer ce document ?', exact: true });
  await expect(confirmation).toBeVisible();
  expect(deleted).toBe(false);
  await confirmation.getByRole('button', { name: 'Conserver', exact: true }).click();
  await expect(confirmation).toBeHidden();
  expect(deleted).toBe(false);
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Supprimer le document', exact: true }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByText('Ordonnance.pdf', { exact: true })).toBeHidden();
  expect(deleted).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
