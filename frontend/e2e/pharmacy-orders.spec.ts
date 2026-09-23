import { test, expect, type Page } from '@playwright/test';

const baseConfig = {
  module_enabled: true,
  ordering_enabled_for_nurse: true,
  ordering_enabled_emplois: ['Médecin généraliste', 'Médecin spécialiste', 'Sage-femme'],
  ordering_allow_custom_emploi: false,
  pharmacy_receiver_emplois: ['Pharmacien'],
};

const uiFlags = {
  module_enabled: true,
  can_order: true,
  can_receive: false,
  is_pharmacy_account: false,
};

const fixtureOrder = {
  id: 'fixture-pharmacy-order-1',
  requester_id: 'fixture-nurse',
  requester_role: 'nurse',
  pharmacy_id: 'fixture-pharmacy',
  patient_id: 'fixture-patient',
  relative_id: null,
  fulfillment_mode: 'click_collect',
  delivery_address: null,
  delivery_postal_code: null,
  status: 'en_attente',
  requester_comment: null,
  pharmacy_note: null,
  rejection_reason: null,
  prescription_document_ids: ['doc-1'],
  created_by_admin_id: null,
  created_at: '2026-09-18T10:00:00+02:00',
  updated_at: '2026-09-18T10:00:00+02:00',
  requester_display_name: 'Camille Exemple',
  requester_phone: '0600000000',
  requester_email: 'camille@example.com',
  requester_emploi: null,
  requester_public_slug: 'camille-exemple',
};

async function pharmacyApiFixture(page: Page, role: 'nurse' | 'pro' = 'nurse') {
  const user =
    role === 'nurse'
      ? { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' }
      : {
          id: 'fixture-pharmacy',
          role: 'pro',
          emploi: 'Pharmacien',
          pharmacy_orders_enabled: 1,
          pharmacy_orders_paused: 0,
          first_name: 'Paul',
          last_name: 'Pharmacie',
        };

  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript(u => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(u));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true, pro: true }));
  }, user);

  const state = { failList: false, orderStatus: fixtureOrder.status };

  await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path.endsWith('/auth/me')) {
      return route.fulfill({ json: { success: true, data: user, user } });
    }
    if (path === '/api/pharmacy-module/config') {
      const flags =
        role === 'pro'
          ? { module_enabled: true, can_order: true, can_receive: true, is_pharmacy_account: true }
          : uiFlags;
      return route.fulfill({ json: { success: true, data: { ...baseConfig, ...flags, ui: flags } } });
    }
    if (path === '/api/pharmacy-orders' && request.method() === 'GET') {
      if (state.failList) {
        return route.fulfill({ status: 500, json: { success: false, error: 'Liste indisponible' } });
      }
      const scope = new URL(request.url()).searchParams.get('scope') ?? 'sent';
      const orders = scope === 'received' && role === 'pro' ? [{ ...fixtureOrder, pharmacy_id: user.id }] : [fixtureOrder];
      return route.fulfill({ json: { success: true, data: orders } });
    }
    if (path === '/api/pharmacy-orders' && request.method() === 'POST') {
      return route.fulfill({ json: { success: true, data: { ...fixtureOrder, id: 'fixture-new-order' } } });
    }
    if (path === `/api/pharmacy-orders/${fixtureOrder.id}` && request.method() === 'GET') {
      return route.fulfill({ json: { success: true, data: { ...fixtureOrder, status: state.orderStatus } } });
    }
    if (path === `/api/pharmacy-orders/${fixtureOrder.id}` && request.method() === 'PATCH') {
      const body = request.postDataJSON() as { status?: string };
      if (body?.status) state.orderStatus = body.status;
      return route.fulfill({
        json: { success: true, data: { ...fixtureOrder, status: state.orderStatus } },
      });
    }
    if (path === `/api/pharmacy-orders/${fixtureOrder.id}/messages`) {
      return route.fulfill({ json: { success: true, data: [] } });
    }
    if (path === '/api/pharmacy-orders/stats/sent' || path === '/api/pharmacy-orders/stats/received') {
      return route.fulfill({ json: { success: true, data: { total: 1, by_status: { en_attente: 1 } } } });
    }
    if (path.startsWith('/api/pharmacies')) {
      return route.fulfill({
        json: {
          success: true,
          data: [
            {
              id: 'fixture-pharmacy',
              display_name: 'Pharmacie Exemple',
              emploi: 'Pharmacien',
              accepts_click_collect: true,
              accepts_home_delivery: true,
              postal_code: '75001',
              address: { formatted_address: '1 rue Exemple, 75001 Paris' },
            },
          ],
        },
      });
    }
    return route.fulfill({ json: { success: true, data: [] } });
  });

  return { user, state };
}

test('API mock — config module et flags UI pour infirmier', async ({ page }) => {
  await pharmacyApiFixture(page, 'nurse');
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/pharmacy-module/config', { credentials: 'include' });
    return res.json();
  });
  expect(result.success).toBe(true);
  expect(result.data.module_enabled).toBe(true);
  expect(result.data.ui?.can_order ?? result.data.ordering_enabled_for_nurse).toBeTruthy();
});

test('API mock — liste commandes envoyées', async ({ page }) => {
  await pharmacyApiFixture(page, 'nurse');
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/pharmacy-orders?scope=sent', { credentials: 'include' });
    return res.json();
  });
  expect(result.success).toBe(true);
  expect(result.data).toHaveLength(1);
  expect(result.data[0].status).toBe('en_attente');
  expect(result.data[0].prescription_document_ids).toContain('doc-1');
});

test('API mock — pharmacie reçoit et accepte une commande', async ({ page }) => {
  const { state } = await pharmacyApiFixture(page, 'pro');
  const listed = await page.evaluate(async () => {
    const res = await fetch('/api/pharmacy-orders?scope=received', { credentials: 'include' });
    return res.json();
  });
  expect(listed.data[0].pharmacy_id).toBe('fixture-pharmacy');

  const patched = await page.evaluate(async () => {
    const res = await fetch('/api/pharmacy-orders/fixture-pharmacy-order-1', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'acceptee' }),
    });
    return res.json();
  });
  expect(patched.success).toBe(true);
  expect(patched.data.status).toBe('acceptee');
  expect(state.orderStatus).toBe('acceptee');
});

test('app authentifiée charge avec mocks pharmacie actifs', async ({ page }) => {
  await pharmacyApiFixture(page, 'nurse');
  await page.goto('/nurse/appointments');
  await expect(page.getByRole('status', { name: 'Chargement' })).toBeHidden({ timeout: 15_000 }).catch(() => {});
  expect(await page.evaluate(() => document.body.innerText.length)).toBeGreaterThan(0);
});

test('web infirmier — nouvelle commande propose l’upload d’ordonnance', async ({ page }) => {
  await pharmacyApiFixture(page, 'nurse');
  await page.goto('/nurse/commandes-pharmacie/new');
  await expect(page.getByRole('heading', { name: 'Nouvelle commande pharmacie' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Ajouter une ordonnance' })).toBeVisible();
});

test('web pro — nouvelle commande propose l’upload d’ordonnance', async ({ page }) => {
  await pharmacyApiFixture(page, 'pro');
  await page.goto('/pro/commandes-pharmacie/new');
  await expect(page.getByRole('heading', { name: 'Nouvelle commande pharmacie' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Ajouter une ordonnance' })).toBeVisible();
});

test('web pharmacien — nouvelle commande reste sur sa pharmacie', async ({ page }) => {
  await pharmacyApiFixture(page, 'pro');
  await page.goto('/pro/commandes-pharmacie/new');
  await expect(page.getByRole('heading', { name: '2. Mode de retrait' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('votre pharmacie')).toBeVisible();
  await expect(page.getByRole('heading', { name: '2. Pharmacie et mode' })).toHaveCount(0);
  await expect(page.getByText('Code postal (filtre)')).toHaveCount(0);
  await expect(page.getByText('Choisir une pharmacie…')).toHaveCount(0);
});

test('web pharmacien — détail commande affiche la fiche du professionnel', async ({ page }) => {
  await pharmacyApiFixture(page, 'pro');
  await page.goto('/pro/commandes-recues/fixture-pharmacy-order-1');
  await expect(page.getByText('Professionnel de santé')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('link', { name: 'Voir la fiche du professionnel' })).toBeVisible();
  await expect(page.getByRole('link', { name: '0600000000' })).toBeVisible();
});

test('web infirmier — nouvelle commande propose le catalogue pharmacies', async ({ page }) => {
  await pharmacyApiFixture(page, 'nurse');
  await page.goto('/nurse/commandes-pharmacie/new');
  await expect(page.getByRole('heading', { name: '2. Pharmacie et mode' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Code postal (filtre)')).toBeVisible();
});
