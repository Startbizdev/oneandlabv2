import { test, expect } from '@playwright/test';

const apiPattern = () => new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href;

test('login preserves an existing account after lookup failure and accepts leading-zero OTP', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.addInitScript(() => localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ patient: true })));
  let lookupFails = true;
  const codes: string[] = [];
  const user = { id: 'fixture-patient', role: 'patient', first_name: 'Camille', last_name: 'Exemple' };
  await page.route(apiPattern(), route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/check-email') return route.fulfill({ json: { success: !lookupFails, exists: true, error: lookupFails ? 'Vérification indisponible' : undefined } });
    if (path === '/api/auth/request-otp') return route.fulfill({ json: { success: true, user_id: user.id, session_id: 'fixture-session' } });
    if (path === '/api/auth/verify-otp') {
      codes.push(route.request().postDataJSON().otp);
      return route.fulfill({ json: codes.length === 1 ? { success: false, error: 'Code invalide' } : { success: true, token: 'local-ui-fixture', user } });
    }
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('fixture@example.invalid');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByText('Vérification indisponible', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Créer un compte', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveValue('fixture@example.invalid');
  lookupFails = false;
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Votre code', exact: true })).toBeVisible();
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const [index, digit] of [...'001234'].entries()) await page.getByRole('textbox', { name: `pin input ${index + 1} of 6`, exact: true }).fill(digit);
    await page.getByRole('button', { name: 'Valider', exact: true }).click();
    if (!attempt) await expect(page.getByRole('textbox', { name: 'pin input 1 of 6', exact: true })).toHaveValue('');
  }
  await expect(page).toHaveURL(/\/patient(?:\/|$)/);
  expect(codes).toEqual(['001234', '001234']);
});

test('forgot password keeps the form after an API refusal', async ({ page }) => {
  let fail = true;
  await page.route(apiPattern(), route => route.fulfill({ json: { success: !fail, error: fail ? 'Envoi indisponible' : undefined, data: [] } }));
  await page.goto('/forgot-password');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('fixture@example.invalid');
  await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
  await expect(page.getByText('Envoi indisponible', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveValue('fixture@example.invalid');
  fail = false;
  await page.getByRole('button', { name: 'Envoyer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Regardez votre boîte mail', exact: true })).toBeVisible();
});

test('password reset only confirms an accepted server response', async ({ page }) => {
  let fail = true;
  await page.route(apiPattern(), route => route.fulfill({ json: { success: !fail, error: fail ? 'Modification indisponible' : undefined, data: [] } }));
  await page.goto('/reset-password?token=synthetic-reset');
  await page.getByLabel('Nouveau mot de passe', { exact: true }).fill('Synthetic-test-8492');
  await page.getByLabel('Confirmation', { exact: true }).fill('Synthetic-test-8492');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('Modification indisponible', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/reset-password\?/);
  fail = false;
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page).toHaveURL(/\/login\?mode=password$/);
});
