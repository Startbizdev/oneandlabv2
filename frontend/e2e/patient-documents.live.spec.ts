import { test, expect } from './fixtures/test';

// Aucun mock : frontend → API PHP → MySQL (compte créé par backend/scripts/e2e-live-seed.php).
const EMAIL = 'alice.patient@test.invalid';
const PASSWORD = 'E2e-Live-Cary-2026!';

test('patient réel : connexion mot de passe, upload chiffré, relecture et suppression', async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ patient: true })));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto('/login?mode=password');
  await page.getByLabel('Email', { exact: true }).fill(EMAIL);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

  const fileName = `Ordonnance-live-${Date.now()}.pdf`;
  await page.goto('/patient/documents');
  await page.getByRole('button', { name: 'Ajouter un document', exact: true }).click();
  const upload = page.getByRole('dialog', { name: 'Ajouter un document', exact: true });
  await upload.locator('input[type=file]').setInputFiles({
    name: fileName,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\nLive e2e synthetic document\n%%EOF'),
  });
  const posted = page.waitForResponse(r => r.url().includes('/api/medical-documents') && r.request().method() === 'POST');
  await upload.getByRole('button', { name: 'Envoyer', exact: true }).click();
  expect((await (await posted).json()).success).toBe(true);
  await expect(upload).toBeHidden();
  await expect(page.getByText(fileName, { exact: true })).toBeVisible();

  // Relecture depuis la base après rechargement complet
  await page.reload();
  await expect(page.getByText(fileName, { exact: true })).toBeVisible();

  // Base vierge à chaque run : ce document est le seul du compte
  await expect(page.getByRole('button', { name: 'Supprimer', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Supprimer ce document ?', exact: true });
  await confirmation.getByRole('button', { name: 'Supprimer le document', exact: true }).click();
  await expect(confirmation).toBeHidden();
  await expect(page.getByText(fileName, { exact: true })).toBeHidden();

  await page.reload();
  await expect(page.getByText(fileName, { exact: true })).toBeHidden();
  expect(errors).toEqual([]);
});
