import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  test(`lab statistics: unavailable data, retry and complete appointment details at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const user = { id: 'fixture-lab', role: 'lab', first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ lab: true }));
    }, user);
    await page.route('**/api/**', route => route.fulfill({ json: { success: true, user, data: route.request().url().includes('/auth/me') ? user : [] } }));
    let failed = true;
    await page.route('**/api/lab/stats', route => route.fulfill({ json: { success: !failed, data: {
      isLabView: true,
      teamSummary: { lab: 1, subaccounts: 1, preleveurs: 1, total: 3 },
      stats: { totalAppointments: 100, monthAppointments: 12, completionRate: 75, averageDuration: 0, byStatus: { completed: 75, pending: 25 }, byType: { blood_test: 100 } },
      byAssignedLab: [{ id: 'fixture-team', displayName: 'Laboratoire Exemple Quartier Nord', role: 'subaccount', total: 100, month: 12, today: 3, completed: 75, completionRate: 75 }],
      appointments: [{ id: 'fixture-appointment', type: 'blood_test', status: 'inProgress', scheduled_at: '2026-10-15 09:00:00', created_at: '2026-09-15 10:00:00', started_at: '2026-10-15 09:15:00', address: { label: 'Adresse fictive, Paris' }, assigned_lab_display_name: 'Équipe Exemple', assigned_to_display_name: 'Camille Exemple', form_data: { first_name: 'Louise', last_name: 'Exemple', phone: '0600000000', blood_test_type: 'multiple', duration_days: 14, frequency: 'daily', notes: 'Consigne fictive conservée', availability: { type: 'custom', start: '09:00', end: '10:00' } } }],
    } } }));
    await page.goto('/lab/stats');
    await expect(page.getByText('Statistiques indisponibles', { exact: true })).toBeVisible();
    await expect(page.getByText('Rendez-vous au total', { exact: true })).toBeHidden();
    failed = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByText('Activité par équipe', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Louise Exemple', exact: true })).toBeVisible();
    await expect(page.getByText('Adresse fictive, Paris', { exact: true })).toBeVisible();
    await expect(page.getByText('Consigne fictive conservée', { exact: true })).toBeVisible();
    await expect(page.getByText('9h00 - 10h00', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Voir le rendez-vous', exact: true })).toHaveAttribute('href', '/lab/appointments/fixture-appointment');
    await expect(page.getByText('0 min', { exact: true })).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/lab-statistics-${width}.png`, fullPage: true });
    await page.getByRole('link', { name: 'Voir le rendez-vous', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('link', { name: 'Voir le rendez-vous', exact: true })).toBeInViewport();
    await page.screenshot({ path: `test-results/lab-statistics-detail-${width}.png`, fullPage: true });
  });
}
