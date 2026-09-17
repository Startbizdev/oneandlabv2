import { test, expect, type Page } from '@playwright/test';

function formatTourDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function nurseTourFixture(page: Page) {
  const tourDate = formatTourDate(new Date());
  const user = { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addInitScript((u) => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(u));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
  }, user);

  const category = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Injection',
    type: 'nursing',
    options: [],
  };

  const stops = [
    {
      stop_id: 'stop-a',
      appointment_id: 'apt-a',
      position: 1,
      visit_status: 'todo',
      patient_name: 'Louise Alpha',
      patient_id: 'patient-a',
      category_name: 'Injection',
      category_id: category.id,
      status: 'confirmed',
      scheduled_at: `${tourDate} 08:00:00`,
      address_line: '1 rue Alpha',
      distance_km_from_prev: 0,
      drive_min_from_prev: 0,
      passage_series_id: null,
    },
    {
      stop_id: 'stop-b',
      appointment_id: 'apt-b',
      position: 2,
      visit_status: 'todo',
      patient_name: 'Marc Beta',
      patient_id: 'patient-b',
      category_name: 'Injection',
      category_id: category.id,
      status: 'confirmed',
      scheduled_at: `${tourDate} 09:00:00`,
      address_line: '2 rue Beta',
      distance_km_from_prev: 1.2,
      drive_min_from_prev: 4,
      passage_series_id: 'fixture-series',
    },
  ];

  const tourPayload = {
    date: tourDate,
    plan: { id: 'plan-1', sort_mode: 'smart', manual_order_locked: false, nav_app_pref: 'waze' },
    summary: { total_stops: 2, done_stops: 0, absent_stops: 0, estimated_km: 1.2 },
    stops,
    next_stop_id: 'stop-a',
  };

  const appointments: Record<string, Record<string, unknown>> = {
    'apt-a': {
      id: 'apt-a',
      patient_id: 'patient-a',
      type: 'nursing',
      status: 'confirmed',
      scheduled_at: `${tourDate} 08:00:00`,
      category_id: category.id,
      form_data: {
        notes: 'Note Alpha',
        nursing_items: [{ category_id: category.id, label: category.name }],
        availability: JSON.stringify({ type: 'custom', range: [8, 12] }),
      },
    },
    'apt-b': {
      id: 'apt-b',
      patient_id: 'patient-b',
      type: 'nursing',
      status: 'confirmed',
      scheduled_at: `${tourDate} 09:00:00`,
      category_id: category.id,
      form_data: {
        notes: 'Note Beta',
        nursing_items: [{ category_id: category.id, label: category.name }],
        availability: JSON.stringify({ type: 'custom', range: [9, 13] }),
      },
    },
  };

  const patients: Record<string, Record<string, unknown>> = {
    'patient-a': { id: 'patient-a', first_name: 'Louise', last_name: 'Alpha' },
    'patient-b': { id: 'patient-b', first_name: 'Marc', last_name: 'Beta' },
  };

  let tourCalls = 0;

  await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/\/$/, '') || '/';
    const requestedTourDate = url.searchParams.get('date') ?? tourDate;

    if (path === '/api/auth/me') {
      return route.fulfill({ json: { success: true, data: user, user } });
    }
    if (path === '/api/categories' || path === '/api/categories/') {
      return route.fulfill({ json: { success: true, data: [category] } });
    }
    if (path === '/api/nurse/tour/summary') {
      return route.fulfill({
        json: { success: true, data: { counts: { [tourDate]: 2 } } },
      });
    }
    if (path === '/api/nurse/tour') {
      tourCalls += 1;
      return route.fulfill({
        json: {
          success: true,
          data: { ...tourPayload, date: requestedTourDate },
        },
      });
    }
    if (path === '/api/nurse/passages/series/fixture-series') {
      return route.fulfill({
        json: {
          success: true,
          data: {
            id: 'fixture-series',
            patient_id: 'patient-b',
            planning_type: 'single_day',
            planning_config: { start_date: tourDate },
            first_date: tourDate,
            time_slot: 'morning',
            duration_minutes: 30,
            at_home: true,
            notes: 'Note série',
            nursing_items: [{ category_id: category.id, label: category.name }],
          },
        },
      });
    }
    if (path.startsWith('/api/appointments/')) {
      const aptId = path.replace('/api/appointments/', '');
      const apt = appointments[aptId];
      if (!apt) return route.fulfill({ json: { success: false, error: 'Introuvable' } });
      return route.fulfill({ json: { success: true, data: apt } });
    }
    if (path.startsWith('/api/users/')) {
      const pid = path.replace('/api/users/', '').split('?')[0];
      if (pid === 'me') return route.fulfill({ json: { success: true, data: user } });
      const patient = patients[pid];
      return route.fulfill({ json: { success: true, data: patient ?? null } });
    }
    if (path === '/api/medical-documents') {
      return route.fulfill({ json: { success: true, data: [] } });
    }
    if (path.startsWith('/api/notifications')) {
      return route.fulfill({ json: { success: true, data: [] } });
    }
    if (path.startsWith('/api/appointments')) {
      return route.fulfill({ json: { success: true, data: [] } });
    }
    return route.fulfill({ json: { success: true, data: [] } });
  });

  return {
    getTourCalls: () => tourCalls,
  };
}

test('nurse tournee list renders stops without waiting for summary', async ({ page }) => {
  const { getTourCalls } = await nurseTourFixture(page);
  await page.goto('/nurse/tournee');
  await expect(page.getByText('Louise Alpha', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Marc Beta', { exact: true })).toBeVisible();
  expect(getTourCalls()).toBeGreaterThanOrEqual(1);
});

test('nurse tournee opens rdv-only stops and reloads when switching appointment', async ({ page }) => {
  await nurseTourFixture(page);
  await page.goto('/nurse/tournee');
  await page.getByRole('button', { name: /Louise Alpha/ }).click();
  await expect(page).toHaveURL(/appointment_id=apt-a/);
  await expect(page.getByText('Louise Alpha', { exact: true })).toBeVisible();
  await page.goto('/nurse/tournee');
  await page.getByRole('button', { name: /Louise Alpha/ }).click();
  await page.goto('/nurse/passage/rdv?appointment_id=apt-b&stop_id=stop-b');
  await expect(page.getByText('Marc Beta', { exact: true })).toBeVisible();
  await page.goto('/nurse/passage/rdv?appointment_id=apt-a&stop_id=stop-a');
  await expect(page.getByText('Louise Alpha', { exact: true })).toBeVisible();
});

test('nurse passage rdv without appointment_id shows error not blank header', async ({ page }) => {
  await nurseTourFixture(page);
  await page.goto('/nurse/passage/rdv');
  await expect(
    page.getByText('Rendez-vous manquant — ouvrez ce passage depuis la tournée.', { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('button', { name: /^Note / })).toHaveCount(0);
});
