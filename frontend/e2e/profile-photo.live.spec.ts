import { execFileSync } from 'node:child_process';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test';

// Aucun mock : frontend → API PHP → MySQL (comptes créés par backend/scripts/e2e-live-seed.php).
const PASSWORD = 'E2e-Live-Cary-2026!';
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const ACCOUNTS = [
  { role: 'patient', email: 'alice.patient@test.invalid', userId: '00000000-0000-4000-8000-00000000a001' },
  { role: 'nurse', email: 'nina.nurse@test.invalid', userId: '00000000-0000-4000-8000-00000000b001' },
  { role: 'lab', email: 'labo@test.invalid', userId: '00000000-0000-4000-8000-00000000c001' },
  { role: 'pro', email: 'pro@test.invalid', userId: '00000000-0000-4000-8000-00000000d001' },
] as const;

function mysql(sql: string): string {
  return execFileSync(
    'docker',
    ['compose', '-f', '../docker-compose.e2e-live.yml', 'exec', '-T', 'mysql-e2e', 'mysql', '-uroot', '-N', '-B', 'oneandlab_test', '-e', sql],
    { encoding: 'utf8' },
  ).trim();
}

const storedPhoto = (userId: string) =>
  mysql(`SELECT COALESCE(LEFT(profile_image_url, 11), 'NULL') FROM profiles WHERE id = '${userId}'`);

async function login(page: Page, role: string, email: string) {
  await page.addInitScript(r => localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [r]: true })), role);
  await page.goto('/login?mode=password');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

/** L'infirmier ne peut enregistrer son profil qu'avec un genre et un identifiant professionnel valides. */
async function completeNurseProfile(page: Page, userId: string) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const authorization = `Bearer ${token}`;
  const csrfRes = await page.request.get('/api/auth/csrf-token', { headers: { Authorization: authorization } });
  const csrf = (await csrfRes.json()).data.csrf_token as string;
  const res = await page.request.put(`/api/users/${userId}`, {
    headers: { Authorization: authorization, 'X-CSRF-Token': csrf },
    data: { gender: 'female', professional_id: '10101010101', rpps: '10101010101' },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

async function saveProfile(page: Page) {
  await page.getByRole('button', { name: /^Enregistrer( mon profil)?$/ }).first().click();
  await expect(page.getByText('Toutes les modifications ont été enregistrées.', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
}

for (const account of ACCOUNTS) {
  test(`photo de profil ${account.role} : ajout puis suppression enregistrés en base`, async ({ page }) => {
    test.setTimeout(120_000);
    mysql(`UPDATE profiles SET profile_image_url = NULL WHERE id = '${account.userId}'`);
    await login(page, account.role, account.email);
    if (account.role === 'nurse') await completeNurseProfile(page, account.userId);

    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const photoInput = page.locator('input[type="file"][accept*="image/png"]').first();
    await photoInput.setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG_1PX });
    await expect(page.locator('img[alt="Photo de profil"], img[alt="Logo"]').first()).toBeVisible();

    await saveProfile(page);
    await expect.poll(() => storedPhoto(account.userId), { timeout: 10_000 }).toBe('data:image/');

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('img[alt="Photo de profil"], img[alt="Logo"]').first()).toHaveAttribute('src', /^data:image\//);

    await page.getByRole('button', { name: 'Changer' }).first().locator('xpath=following-sibling::button[1]').click();
    await saveProfile(page);
    await expect.poll(() => storedPhoto(account.userId), { timeout: 10_000 }).toBe('NULL');
  });
}
