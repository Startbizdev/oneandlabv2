import { test, expect, type Page } from '@playwright/test';

async function signIn(page: Page, role: string) {
  const user = { id: 'fixture-staff', role, first_name: 'Camille', last_name: 'Exemple' };
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [user.role]: true }));
  }, user);
  await page.route('**/api/**', route => route.fulfill({ json: { success: true, user, data: route.request().url().includes('/auth/me') ? user : [] } }));
}

for (const failSecondPage of [false, true]) {
  test(`calendar: ${failSecondPage ? 'incomplete page fails visibly and retries' : 'loads every page and navigates from January 31 to February'}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-01-31T12:00:00Z'));
    await signIn(page, 'super_admin');
    await page.setViewportSize({ width: 1440, height: 1100 });
    let fail = failSecondPage;
    const ranges: string[] = [];
    await page.route('**/api/appointments?**', route => {
      const params = new URL(route.request().url()).searchParams;
      expect(params.get('limit')).toBe('50');
      const dateFrom = params.get('date_from') || '';
      ranges.push(dateFrom);
      const number = Number(params.get('page'));
      if (number === 2 && fail) return route.fulfill({ json: { success: false, error: 'Page indisponible' } });
      const prefix = dateFrom.slice(0, 7);
      return route.fulfill({ json: { success: true, data: [{ id: `fixture-page-${number}`, type: 'nursing', status: 'confirmed', scheduled_at: `${prefix}-${number === 1 ? '15' : '16'} 08:30:00`, form_data: { first_name: 'Camille', last_name: `Exemple ${number}` } }], pagination: { page: number, limit: 50, pages: 2, total: 2, has_more: number === 1 } } });
    });
    await page.goto('/admin/calendar');
    if (fail) {
      await expect(page.getByText('Impossible de charger le calendrier')).toBeVisible();
      await expect(page.locator('[data-appointment-id="fixture-page-1"]')).toBeHidden();
      fail = false;
      await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    }
    await expect(page.locator('[data-appointment-id="fixture-page-2"]')).toBeVisible();
    await page.getByRole('button', { name: 'Suivant', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'février 2026' })).toBeVisible();
    await expect.poll(() => ranges.includes('2026-02-01 00:00:00')).toBe(true);
    await expect(page.locator('[data-calendar-date="2026-02-16"] [data-appointment-id="fixture-page-2"]')).toBeVisible();
  });
}

test('nurse: recurring care does not invent duration or frequency and completion preserves filters', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-09-15T12:00:00Z'));
  await signIn(page, 'nurse');
  await page.setViewportSize({ width: 360, height: 900 });
  const requests: URLSearchParams[] = [];
  let completed = false;
  await page.route('**/api/appointments?**', route => {
    const params = new URL(route.request().url()).searchParams;
    if (params.get('status') !== 'confirmed,inProgress') return route.fulfill({ json: { success: true, data: [] } });
    requests.push(params);
    return route.fulfill({ json: { success: true, data: completed ? [] : [
      { id: 'fixture-care', type: 'nursing', status: 'confirmed', scheduled_at: '2030-10-15 08:30:00', form_data: { first_name: 'Camille', last_name: 'Exemple', frequency: 'twice_daily' } },
      { id: 'fixture-single', type: 'nursing', status: 'confirmed', scheduled_at: '2030-10-15 08:30:00', form_data: { first_name: 'Visite', last_name: 'Unique', frequency: 'once_daily', duration_days: 1 } },
    ] } });
  });
  await page.route('**/api/appointments/fixture-care', route => {
    expect(route.request().postDataJSON()).toEqual({ status: 'completed' });
    completed = true;
    return route.fulfill({ json: { success: true } });
  });
  await page.goto('/nurse/soins');
  await expect(page.getByText('À préciser avec le professionnel', { exact: true })).toBeVisible();
  await expect(page.getByText('Environ 1 semaine', { exact: true })).toBeHidden();
  await expect(page.getByText('Visite Unique', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Terminer', exact: true }).click();
  await expect(page.getByText('Aucun plan de soins actif', { exact: true })).toBeVisible();
  expect(requests.length).toBe(2);
  for (const params of requests) {
    expect(params.get('status')).toBe('confirmed,inProgress');
    expect(params.get('nurse_tab')).toBe('soins');
    expect(params.get('type')).toBe('nursing');
  }
});

for (const failure of [false, true]) {
  test(`review moderation ${failure ? 'retains visibility on failure' : 'persists visibility'}`, async ({ page }) => {
    await signIn(page, 'super_admin');
    const review = { id: 'fixture-review', reviewer_name: 'Louise Exemple', reviewee_name: 'Camille Exemple', rating: 4, comment: 'Suivi clair et ponctuel.', is_visible: true, created_at: '2026-09-15 09:00:00' };
    let submitted: unknown;
    await page.route('**/api/reviews', route => route.fulfill({ json: { success: true, data: [review] } }));
    await page.route('**/api/reviews/fixture-review/moderate', route => {
      submitted = route.request().postDataJSON();
      if (!failure) review.is_visible = false;
      return route.fulfill({ json: failure ? { success: false, error: 'Modification indisponible' } : { success: true } });
    });
    await page.goto('/admin/reviews');
    await expect(page.getByRole('button', { name: 'Détails', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Masquer', exact: true }).click();
    await expect.poll(() => submitted).toEqual({ is_visible: false });
    if (failure) {
      await expect(page.getByText('Modification indisponible', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Masquer', exact: true })).toBeEnabled();
      await expect(page.getByText('Avis masqué', { exact: true })).toBeHidden();
    } else {
      await expect(page.getByRole('button', { name: 'Afficher', exact: true })).toBeVisible();
    }
  });
}

test('admin: review details open inside an accessible dialog', async ({ page }) => {
  await signIn(page, 'super_admin');
  await page.setViewportSize({ width: 360, height: 900 });
  await page.route('**/api/reviews', route => route.fulfill({ json: { success: true, data: [{ id: 'fixture-review', reviewer_name: 'Louise Exemple', reviewee_name: 'Camille Exemple', rating: 4, comment: 'Suivi clair et ponctuel.', is_visible: true, created_at: '2026-09-15 09:00:00' }] } }));
  await page.goto('/admin/reviews');
  await page.getByRole('button', { name: 'Détails', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Détails de l’avis', exact: true });
  await expect(dialog.getByText('Louise Exemple', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

for (const role of ['nurse', 'lab', 'subaccount']) {
  test(`${role}: reply retains the draft after failure and saves on retry`, async ({ page }) => {
    await signIn(page, role);
    await page.setViewportSize({ width: 360, height: 900 });
    await page.route('**/api/reviews?**', route => route.fulfill({ json: { success: true, data: [{ id: 'fixture-review', reviewer_name: 'Louise Exemple', rating: 4, comment: 'Suivi clair et ponctuel.', is_visible: true, created_at: '2026-09-15 09:00:00' }] } }));
    await page.route('**/api/reviews/stats?**', route => route.fulfill({ json: { success: true, data: { total_reviews: 1, average_rating: '4.0' } } }));
    let attempts = 0;
    await page.route('**/api/reviews/fixture-review/response', route => {
      attempts++;
      expect(route.request().postDataJSON()).toEqual({ response: 'Merci pour votre retour.' });
      return route.fulfill({ json: attempts === 1 ? { success: false, error: 'Envoi temporairement indisponible' } : { success: true } });
    });
    await page.goto(`/${role}/reviews`);
    await page.getByRole('button', { name: 'Répondre', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Répondre à l’avis', exact: true });
    await dialog.getByRole('textbox', { name: 'Votre réponse' }).fill('Merci pour votre retour.');
    await dialog.getByRole('button', { name: 'Envoyer la réponse' }).click();
    await expect(dialog.getByRole('textbox', { name: 'Votre réponse' })).toHaveValue('Merci pour votre retour.');
    await expect(dialog.getByRole('alert')).toHaveText('Envoi temporairement indisponible');
    await dialog.getByRole('button', { name: 'Envoyer la réponse' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText('Merci pour votre retour.', { exact: true })).toBeVisible();
    expect(attempts).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/${role}-review-reply-360.png`, fullPage: true });
  });
}

test('subaccount: member calendar link retains the team filter', async ({ page }) => {
  await signIn(page, 'subaccount');
  await page.setViewportSize({ width: 360, height: 900 });
  await page.route('**/api/users?role=preleveur', route => route.fulfill({ json: { success: true, data: [{ id: 'fixture-preleveur', first_name: 'Louise', last_name: 'Exemple', email: 'fixture@example.invalid', stats: { totalAppointments: 12, todayAppointments: 3 } }] } }));
  await page.goto('/subaccount/preleveurs');
  await expect(page.getByRole('heading', { name: 'Louise Exemple' })).toBeVisible();
  await expect(page.getByText('12 rendez-vous · 3 aujourd’hui')).toBeVisible();
  const request = page.waitForRequest(request => request.url().includes('/appointments?') && new URL(request.url()).searchParams.get('filter_assigned_to') === 'fixture-preleveur');
  await page.getByRole('link', { name: 'Voir le calendrier' }).click();
  await request;
  await expect(page).toHaveURL(/\/subaccount\/calendar\?assigned_to=fixture-preleveur/);
});

for (const failure of [false, true]) {
  test(`calendar drag ${failure ? 'keeps the date on API failure' : 'saves the new date and original time'}`, async ({ page }) => {
    await signIn(page, 'super_admin');
    await page.setViewportSize({ width: 1440, height: 1100 });
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const appointment = { id: 'fixture-appointment', type: 'blood_test', status: 'confirmed', scheduled_at: `${prefix}-15 08:30:00`, form_data: { first_name: 'Louise', last_name: 'Exemple' } };
    let submitted: any;
    await page.route('**/api/appointments?**', route => route.fulfill({ json: { success: true, data: [appointment] } }));
    await page.route('**/api/appointments/fixture-appointment', route => {
      submitted = route.request().postDataJSON();
      if (!failure) appointment.scheduled_at = submitted.scheduled_at;
      return route.fulfill({ json: failure ? { success: false, error: 'Modification indisponible' } : { success: true } });
    });
    await page.goto('/admin/calendar');
    const item = page.locator('[data-appointment-id="fixture-appointment"]');
    await expect(item).toHaveAttribute('draggable', 'true');
    await item.dragTo(page.locator(`[data-calendar-date="${prefix}-16"]`));
    await expect.poll(() => submitted).toEqual({ scheduled_at: `${prefix}-16 08:30:00` });
    if (failure) {
      await expect(page.getByText('Le rendez-vous n’a pas été déplacé', { exact: true })).toBeVisible();
      await expect(page.locator(`[data-calendar-date="${prefix}-15"]`).locator('[data-appointment-id="fixture-appointment"]')).toBeVisible();
    } else {
      await expect(page.locator(`[data-calendar-date="${prefix}-16"]`).locator('[data-appointment-id="fixture-appointment"]')).toBeVisible();
    }
  });
}
