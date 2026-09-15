import { test, expect } from '@playwright/test';

for (const width of [360, 1440]) {
  test(`patient availability uses clear keyboard-operable choices at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    let writes = 0;
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      if (route.request().method() === 'POST') writes++;
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto('/rendez-vous/nouveau?type=blood_test');
    await expect(page.getByRole('heading', { name: 'Choix du laboratoire', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    const options = page.getByRole('radiogroup', { name: 'Disponibilité horaire', exact: true });
    const allDay = options.getByRole('radio', { name: 'Toute la journée', exact: true });
    await allDay.click();
    await allDay.press('ArrowRight');
    await expect(options.getByRole('radio', { name: 'Créneau horaire', exact: true })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('End');
    const priority = options.getByRole('radio', { name: 'Prioritaire', exact: true });
    await expect(priority).toBeFocused();
    await expect(priority).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Horaire prioritaire · 14,99 € TTC', { exact: true })).toBeVisible();
    await expect(page.getByText(/La prise en charge reste à confirmer par le professionnel/)).toBeVisible();
    await page.getByRole('button', { name: /Heure précise/ }).click();
    await expect(page.getByRole('combobox', { name: 'Heure souhaitée', exact: true })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Minutes', exact: true })).toBeVisible();
    expect(await priority.evaluate(node => getComputedStyle(node).backgroundImage)).toBe('none');
    await page.screenshot({ path: `test-results/booking-priority-${width}.png`, fullPage: true });
    await priority.press('Home');
    await expect(allDay).toBeFocused();
    await expect(allDay).toHaveAttribute('aria-checked', 'true');
    expect(writes).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/booking-availability-${width}.png`, fullPage: true });
  });
}
