import { test, expect } from '@playwright/test';
test.describe.configure({ mode: 'parallel' });

for (const role of ['super_admin', 'lab', 'subaccount', 'pro', 'patient', 'nurse', 'preleveur']) {
  for (const width of [360, 1440]) {
    test(`${role}: populated appointment detail at ${width}px`, async ({ page }) => {
      const user = { id: 'fixture-staff', role, first_name: 'Camille', last_name: 'Exemple', email: 'fixture@example.invalid' };
      await page.addInitScript(user => {
        localStorage.setItem('auth_token', 'local-ui-fixture');
        localStorage.setItem('auth_user', JSON.stringify(user));
        localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [user.role]: true }));
      }, user);
      const appointment = {
        id: 'fixture-appointment', patient_id: role === 'patient' ? user.id : 'fixture-patient',
        type: role === 'nurse' ? 'nursing' : 'blood_test', form_type: role === 'nurse' ? 'nursing' : 'blood_test',
        status: 'confirmed', scheduled_at: '2026-10-15 08:30:00', created_at: '2026-09-15 09:00:00',
        assigned_nurse_id: role === 'nurse' ? user.id : null, assigned_lab_id: ['lab', 'subaccount'].includes(role) ? user.id : 'fixture-lab', assigned_to: role === 'preleveur' ? user.id : null,
        address: '10 rue Exemple, 75001 Paris', category_name: 'Soin de suivi', category_id: 'fixture-care', category_image_url: '/api/old-care.png',
        form_data: { first_name: 'Louise', last_name: 'Exemple', email: 'fixture@example.invalid', phone: '0100000000', birth_date: '1990-01-01', gender: 'female', duration_days: '7', frequency: 'once_daily', availability: { type: 'custom', range: [8, 10] }, address: { label: '10 rue Exemple, 75001 Paris', lat: 48.86, lng: 2.34 } },
      };
      await page.setViewportSize({ width, height: 1000 });
      await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/categories') return route.fulfill({ json: { success: true, data: [{ id: 'fixture-care', name: 'Soin de suivi', type: appointment.type, icon: 'syringe', image_url: '/api/old-care.png' }] } });
        if (path === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
        if (path === '/api/appointments/fixture-appointment') return route.fulfill({ json: { success: true, data: appointment } });
        if (path === '/api/medical-documents') return route.fulfill({ json: { success: true, data: [{ id: 'fixture-document', document_type: 'ordonnance', file_name: 'Ordonnance-fictive.pdf', file_size: 1024, mime_type: 'application/pdf', created_at: '2026-09-15 09:00:00' }] } });
        return route.fulfill({ json: { success: true, data: [] } });
      });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`/${role === 'super_admin' ? 'admin' : role}/appointments/fixture-appointment`);
      await expect(page.getByRole('link', { name: 'Retour à la liste', exact: true })).toBeVisible();
      await expect(page.getByText(role === 'patient' ? 'Soin de suivi' : /Louise/).first()).toBeVisible();
      await expect(page.getByText('Rendez-vous introuvable', { exact: true })).toBeHidden();
      if (role === 'lab' && width === 360) {
        const actions = page.getByRole('button', { name: 'Actions et affectation', exact: true });
        await expect(actions).toHaveAttribute('aria-expanded', 'false');
        await actions.click();
        await expect(page.getByRole('button', { name: 'Appliquer l’assignation', exact: true })).toBeVisible();
        await actions.click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.locator('[class*="syringe"]').first()).toBeVisible();
      await expect(page.locator('img[src="/api/old-care.png"]')).toHaveCount(0);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `test-results/appointment-detail-${role}-${width}.png`, fullPage: true });
    });
  }
}

test('nurse creator can read the patient conversation and cancel the appointment', async ({ page }) => {
  const user = { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
  const appointment = {
    id: 'fixture-appointment',
    patient_id: 'fixture-patient',
    type: 'blood_test',
    form_type: 'blood_test',
    status: 'confirmed',
    scheduled_at: '2026-10-15 08:30:00',
    created_at: '2026-09-15 09:00:00',
    created_by: user.id,
    created_by_role: 'nurse',
    assigned_nurse_id: null,
    assigned_lab_id: 'fixture-lab',
    assigned_to: 'fixture-preleveur',
    address: '10 rue Exemple, 75001 Paris',
    category_name: 'Bilan sanguin',
    category_id: 'fixture-care',
    form_data: {
      first_name: 'Louise',
      last_name: 'Exemple',
      phone: '0100000000',
      birth_date: '1990-01-01',
      gender: 'female',
      address: { label: '10 rue Exemple, 75001 Paris', lat: 48.86, lng: 2.34 },
    },
  };
  let cancelPayload: Record<string, unknown> | null = null;
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
  }, user);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
    if (url.pathname === '/api/appointments/fixture-appointment/conversation') {
      return route.fulfill({ json: { success: true, data: { messages: [], can_post: true } } });
    }
    if (url.pathname === '/api/appointments/fixture-appointment' && route.request().method() === 'PUT') {
      cancelPayload = route.request().postDataJSON() as Record<string, unknown>;
      appointment.status = 'canceled';
      return route.fulfill({ json: { success: true, data: appointment } });
    }
    if (url.pathname === '/api/appointments/fixture-appointment') {
      return route.fulfill({ json: { success: true, data: appointment } });
    }
    return route.fulfill({ json: { success: true, data: [], pagination: { pages: 1 } } });
  });

  await page.goto('/nurse/appointments/fixture-appointment');
  await expect(page.getByText('Messages patient', { exact: true })).toBeVisible();
  await expect(page.getByText('Aucun message pour ce rendez-vous.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Annuler le rendez-vous', exact: true }).click();
  await page.getByText('Choisir une raison', { exact: true }).click();
  await page.getByRole('option', { name: 'Demande du patient', exact: true }).click();
  await page.getByPlaceholder('Décrivez brièvement la situation...').fill('Demande confirmée par le patient');
  await page.getByRole('button', { name: "Confirmer l'annulation", exact: true }).click();

  await expect.poll(() => cancelPayload).toMatchObject({
    status: 'canceled',
    cancellation_reason: 'patient_request',
    cancellation_comment: 'Demande confirmée par le patient',
  });
});

test('unrelated nurse cannot cancel and sees a real conversation refusal', async ({ page }) => {
  const user = { id: 'fixture-other-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
  const appointment = {
    id: 'fixture-appointment',
    patient_id: 'fixture-patient',
    type: 'blood_test',
    form_type: 'blood_test',
    status: 'confirmed',
    scheduled_at: '2026-10-15 08:30:00',
    created_at: '2026-09-15 09:00:00',
    created_by: 'fixture-nurse',
    assigned_nurse_id: null,
    assigned_lab_id: 'fixture-lab',
    assigned_to: 'fixture-preleveur',
    address: '10 rue Exemple, 75001 Paris',
    category_name: 'Bilan sanguin',
    form_data: {
      first_name: 'Louise',
      last_name: 'Exemple',
      phone: '0100000000',
      birth_date: '1990-01-01',
      gender: 'female',
      address: { label: '10 rue Exemple, 75001 Paris', lat: 48.86, lng: 2.34 },
    },
  };
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
  }, user);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
    if (url.pathname === '/api/appointments/fixture-appointment/conversation') {
      return route.fulfill({
        status: 403,
        json: { success: false, error: 'Accès refusé à ces échanges.' },
      });
    }
    if (url.pathname === '/api/appointments/fixture-appointment') {
      return route.fulfill({ json: { success: true, data: appointment } });
    }
    return route.fulfill({ json: { success: true, data: [], pagination: { pages: 1 } } });
  });

  await page.goto('/nurse/appointments/fixture-appointment');
  await expect(page.getByText('Messages indisponibles', { exact: true })).toBeVisible();
  await expect(page.getByText('Accès refusé à ces échanges.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annuler le rendez-vous', exact: true })).toHaveCount(0);
});
