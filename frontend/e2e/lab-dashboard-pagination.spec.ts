import { test, expect } from '@playwright/test';

for (const role of ['lab', 'subaccount']) {
  test(`${role} dashboard loads all today's appointments without overwriting pending requests`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-15T12:00:00Z'));
    const user = { id: `fixture-${role}`, role, first_name: 'Camille', last_name: 'Exemple' };
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [user.role]: true }));
    }, user);
    const pages: number[] = [];
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/auth/me') return route.fulfill({ json: { success: true, user, data: user } });
      if (url.pathname === '/api/lab/stats') return route.fulfill({ json: { success: true, data: { stats: { totalAppointments: 52, todayCount: 51, byStatus: { pending: 1 } } } } });
      if (url.pathname === '/api/appointments') {
        if (url.searchParams.get('limit') !== '50') return route.fulfill({ json: { success: true, data: [] } });
        expect(url.searchParams.get('scope')).toBe('list');
        const pending = url.searchParams.get('status') === 'pending';
        const current = Number(url.searchParams.get('page'));
        expect(url.searchParams.get('limit')).toBe('50');
        if (!pending) {
          expect(url.searchParams.get('date_from')).toBe('2026-09-15 00:00:00');
          expect(url.searchParams.get('date_to')).toBe('2026-09-15 23:59:59');
          pages.push(current);
        }
        const row = (n: number, name: string) => ({ id: `${pending ? 'pending' : 'today'}-${n}`, type: 'blood_test', status: pending ? 'pending' : 'confirmed', assigned_lab_id: pending ? null : user.id, scheduled_at: '2026-09-15 09:00:00', form_data: { first_name: name, last_name: 'Exemple', availability: '{"type":"all_day"}' } });
        const data = pending ? [row(0, 'Demande à affecter')] : current === 1 ? Array.from({ length: 50 }, (_, n) => row(n, `Patient ${n}`)) : [row(50, 'Dernière page')];
        return route.fulfill({ json: { success: true, data, pagination: { page: current, total: pending ? 1 : 51, pages: pending ? 1 : 2, has_more: !pending && current === 1 } } });
      }
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto(`/${role}`);
    await expect(page.getByText('Dernière page Exemple', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Ouvrir la demande', exact: true })).toBeVisible();
    expect(pages).toEqual([1, 2]);
  });
}
