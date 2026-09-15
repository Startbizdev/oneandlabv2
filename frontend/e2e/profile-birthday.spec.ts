import { test, expect } from '@playwright/test';

test('patient birth date excludes invalid days and resets an initially empty date', async ({ page }) => {
  const user = { id: 'fixture-patient', role: 'patient', first_name: 'Camille', last_name: 'Exemple', email: 'fixture@example.invalid', birth_date: null };
  await page.setViewportSize({ width: 360, height: 900 });
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ patient: true }));
  }, user);
  await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => route.fulfill({ json: { success: true, user, data: route.request().url().includes('/auth/me') ? user : [] } }));
  await page.goto('/patient/profile');
  const day = page.getByRole('combobox', { name: 'Jour de naissance', exact: true });
  const month = page.getByRole('combobox', { name: 'Mois de naissance', exact: true });
  const year = page.getByRole('combobox', { name: 'Année de naissance', exact: true });
  await year.click();
  await page.getByRole('option', { name: '1990', exact: true }).click();
  await month.click();
  await page.getByRole('option', { name: 'Janvier', exact: true }).click();
  await day.click();
  await page.getByRole('option', { name: '31', exact: true }).click();
  await month.click();
  await page.getByRole('option', { name: 'Février', exact: true }).click();
  await expect(day).toContainText('Jour');
  await day.click();
  await expect(page.getByRole('option', { name: '29', exact: true })).toHaveCount(0);
  await page.getByRole('option', { name: '28', exact: true }).click();
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(day).toContainText('Jour');
  await expect(month).toContainText('Mois');
  await expect(year).toContainText('Année');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
