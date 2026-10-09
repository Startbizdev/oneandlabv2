import { expect, type Page } from '@playwright/test';
import { waitForHydration } from './wait-for-nuxt-ready';

/** Mot de passe des comptes `*@test.invalid` posé par backend/scripts/e2e-live-seed.php. */
export const LIVE_PASSWORD = 'E2e-Live-Cary-2026!';

export async function liveLogin(page: Page, role: string, email: string) {
  await page.addInitScript(r => localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [r]: true })), role);
  await page.goto('/login?mode=password');
  await waitForHydration(page);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(LIVE_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
}

type LiveMethod = 'get' | 'post' | 'put' | 'patch';

/** Client API authentifié (Bearer + CSRF de la session) pour le compte connecté dans `page`. */
export async function liveApiClient(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const authorization = `Bearer ${token}`;
  const csrfRes = await page.request.get('/api/auth/csrf-token', { headers: { Authorization: authorization } });
  const csrf = (await csrfRes.json()).data.csrf_token as string;
  const headers = { Authorization: authorization, 'X-CSRF-Token': csrf };
  const call = async (method: LiveMethod, path: string, data?: unknown) => {
    const res = await page.request[method](`/api${path}`, { headers, data });
    return { status: res.status(), headers: res.headers(), body: await res.json() };
  };
  return {
    get: (path: string) => call('get', path),
    post: (path: string, data: unknown) => call('post', path, data),
    put: (path: string, data: unknown) => call('put', path, data),
    patch: (path: string, data: unknown) => call('patch', path, data),
  };
}
