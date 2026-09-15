import { test, expect, type Page } from '@playwright/test';
import { maxVertexDistanceKm } from '@oneandlab/shared-utils';

async function signIn(page: Page) {
  const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
  }, user);
  await page.route('**/api/**', route => route.fulfill({ json: { success: true, user, data: route.request().url().includes('/auth/me') ? user : [] } }));
}

for (const width of [360, 1440]) {
  test(`coverage: failed loads, inactive values and failed edits at ${width}px`, async ({ page }) => {
    await signIn(page);
    await page.setViewportSize({ width, height: 1000 });
    let loadFailed = true, writeFailed = true;
    const writes: any[] = [];
    const zone = { id: 'fixture-zone', owner_id: 'fixture-nurse', role: 'nurse', owner_first_name: 'Louise', owner_last_name: 'Exemple', owner_address_label: 'Adresse fictive, Paris', center_lat: 48.85, center_lng: 2.35, radius_km: 20, is_active: '0' };
    await page.route('**/api/coverage-zones**', route => {
      if (route.request().method() === 'PUT') {
        const body = route.request().postDataJSON();
        writes.push(body);
        if (!writeFailed) Object.assign(zone, body);
        return route.fulfill({ json: { success: !writeFailed } });
      }
      return route.fulfill({ json: { success: !loadFailed, data: [zone] } });
    });
    await page.goto('/admin/coverage');
    await expect(page.getByText('Secteurs indisponibles', { exact: true })).toBeVisible();
    await expect(page.getByText('Aucune zone', { exact: true })).toBeHidden();
    loadFailed = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByText('Inactif', { exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByRole('button', { name: 'Activer', exact: true }).click();
    await expect.poll(() => writes.length).toBe(1);
    await expect(page.getByText('Inactif', { exact: true }).filter({ visible: true })).toBeVisible();
    await page.getByRole('button', { name: 'Modifier', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const range = dialog.getByRole('spinbutton', { name: 'Portée max (km)' });
    await range.fill('25');
    await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(dialog.getByText('Enregistrement impossible', { exact: true })).toBeVisible();
    await expect(range).toHaveValue('25');
    writeFailed = false;
    await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(dialog).toBeHidden();
    expect(writes.at(-1).radius_km).toBe(25);
    expect(writes.at(-1).is_active).toBe(false);
    expect(maxVertexDistanceKm({ lat: 48.85, lng: 2.35 }, writes.at(-1).bounds_json.vertices)).toBeCloseTo(25, 5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByText('Zone modifiée', { exact: true })).toBeHidden({ timeout: 10000 });
    await page.screenshot({ path: `test-results/admin-coverage-${width}.png`, fullPage: true });
  });
}

test('coverage: choose an infirmier beyond the first page and retry a failed profile', async ({ page }) => {
  await signIn(page);
  let profileFailed = true;
  const pages: number[] = [];
  await page.route('**/api/users?**', route => {
    const number = Number(new URL(route.request().url()).searchParams.get('page'));
    pages.push(number);
    return route.fulfill({ json: { success: true, pagination: { pages: 2 }, data: number === 1
      ? Array.from({ length: 100 }, (_, i) => ({ id: `fixture-${i}`, first_name: 'Camille', last_name: `Exemple ${i}` }))
      : [{ id: 'fixture-last', first_name: 'Zélie', last_name: 'Exemple' }],
    } });
  });
  await page.route('**/api/users/fixture-last', route => route.fulfill({ json: { success: !profileFailed, data: {
    id: 'fixture-last', address: { label: 'Adresse fictive, Paris', lat: 48.85, lng: 2.35 },
  } } }));
  await page.goto('/admin/coverage');
  await page.getByRole('button', { name: 'Créer une zone', exact: true }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Choisir un infirmier' }).click();
  await page.getByPlaceholder('Rechercher par nom ou email...').fill('Zélie');
  await page.getByRole('option', { name: 'Zélie Exemple' }).click();
  await expect(dialog.getByText('Adresse indisponible', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Créer la zone', exact: true })).toBeDisabled();
  profileFailed = false;
  await dialog.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(dialog.getByText('Adresse fictive, Paris', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Créer la zone', exact: true })).toBeEnabled();
  expect(pages).toEqual([1, 2]);
});

test('dispatch: unavailable data does not claim zero appointments and can retry', async ({ page }) => {
  await signIn(page);
  let failed = true;
  await page.route('**/api/admin/dispatch?**', route => route.fulfill({ json: { success: !failed, data: {
    rows: [], kpis: { pending_dispatch: 12, redispatch_24h: 2, external_invites_7d: 7, median_accept_minutes: 15 },
    pagination: { page: 1, limit: 25, total: 0, total_pages: 1 },
  } } }));
  await page.goto('/admin/dispatch');
  await expect(page.getByRole('button', { name: 'Réessayer', exact: true })).toBeVisible();
  await expect(page.getByText('Aucun rendez-vous trouvé', { exact: true })).toBeHidden();
  failed = false;
  await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
  await expect(page.getByText('Aucun rendez-vous trouvé', { exact: true })).toBeVisible();
  await expect(page.getByText('12', { exact: true })).toBeVisible();
});

test('dispatch: late search cannot replace the current results', async ({ page }) => {
  await signIn(page);
  let releaseOld!: () => void;
  const held = new Promise<void>(resolve => { releaseOld = resolve; });
  let oldStarted = false;
  await page.route('**/api/admin/dispatch?**', async route => {
    const term = new URL(route.request().url()).searchParams.get('search');
    if (term === 'Ancien') { oldStarted = true; await held; }
    await route.fulfill({ json: { success: true, data: {
      rows: term ? [{ id: term, type: 'nursing', status: 'pending', patient_display_name: `${term} Exemple`, scheduled_at: '2026-10-01 09:00:00', creneau: JSON.stringify({ type: 'custom', range: [15, 20] }) }] : [],
      kpis: {}, pagination: { page: 1, limit: 25, total: term ? 1 : 0, total_pages: 1 },
    } } });
  });
  await page.goto('/admin/dispatch');
  const search = page.getByRole('textbox', { name: 'Rechercher une attribution' });
  await search.fill('Ancien');
  await expect.poll(() => oldStarted).toBe(true);
  await search.fill('Actuel');
  await expect(page.getByRole('heading', { name: 'Actuel Exemple' })).toBeVisible();
  await expect(page.getByText('· 15h00 - 20h00', { exact: true })).toBeVisible();
  const oldResponse = page.waitForResponse(response => response.url().includes('search=Ancien'));
  releaseOld();
  await oldResponse;
  await expect(page.getByRole('heading', { name: 'Actuel Exemple' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ancien Exemple' })).toBeHidden();
});
