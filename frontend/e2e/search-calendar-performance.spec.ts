import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page) {
  const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
  }, user);
  await page.route('**/api/**', route => route.fulfill({ json: { success: true, user, data: new URL(route.request().url()).pathname.endsWith('/auth/me') ? user : [] } }));
}

test('users search: superseded responses cannot replace current results', async ({ page }) => {
  await signIn(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let oldStarted = false;
  const queries: string[] = [];
  await page.route('**/api/users?**', async route => {
    const q = new URL(route.request().url()).searchParams.get('search') || 'Initial';
    queries.push(q);
    if (q === 'Ancien') { oldStarted = true; await held; }
    await route.fulfill({ json: { success: true, data: [{ id: q, role: 'patient', first_name: q, last_name: 'Exemple', email: 'fixture@example.invalid' }], pagination: { total: 1, pages: 1 } } }).catch(() => {});
  });
  await page.goto('/admin/users');
  await expect(page.getByText('Initial Exemple', { exact: true }).first()).toBeVisible();
  const search = page.getByPlaceholder('Nom, email, société…');
  await search.fill('Ancien');
  await expect.poll(() => oldStarted).toBe(true);
  await search.fill('Actuel');
  await expect(page.getByText('Actuel Exemple', { exact: true }).first()).toBeVisible();
  release();
  await expect(page.getByText('Ancien Exemple', { exact: true })).toHaveCount(0);
  expect(queries.filter(q => q === 'Actuel')).toHaveLength(1);
});

test('calendar displays the first page while the next page is pending, then includes it', async ({ page }) => {
  await signIn(page);
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  let secondStarted = false;
  const now = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
  await page.route('**/api/appointments?**', async route => {
    const params = new URL(route.request().url()).searchParams;
    expect(params.get('view')).toBe('calendar');
    expect(params.get('limit')).toBe('250');
    const current = Number(params.get('page'));
    if (current === 2) { secondStarted = true; await held; }
    await route.fulfill({ json: { success: true, data: [{ id: `fixture-${current}`, type: 'nursing', status: 'confirmed', scheduled_at: `${now} 10:00:00`, form_data: { first_name: current === 1 ? 'Premier' : 'Dernier', last_name: 'Exemple' } }], pagination: { page: current, pages: 2, has_more: current === 1, total: 2 } } });
  });
  await page.goto('/admin/calendar');
  await expect.poll(() => secondStarted).toBe(true);
  await expect(page.getByText('Premier Exemple', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Chargement du calendrier' })).toBeVisible();
  release();
  await expect(page.getByText('Dernier Exemple', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Chargement du calendrier' })).toHaveCount(0);
});
