import { test, expect } from '@playwright/test';

test('laboratory: current subscription opens management instead of a second checkout', async ({ page }) => {
  const user = { id: 'fixture-lab', role: 'lab', first_name: 'Camille', last_name: 'Exemple' };
  await page.setViewportSize({ width: 360, height: 900 });
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ lab: true }));
  }, user);
  let checkoutRequests = 0;
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname.includes('/auth/me')) data = user;
    if (url.pathname.endsWith('/plan-limits')) data = { plan_slug: 'lab_starter' };
    if (url.pathname.endsWith('/stripe/subscription')) data = { id: 'fixture-subscription', plan_slug: 'lab_starter', status: 'active', current_period_end: '2026-10-15' };
    if (url.pathname.includes('create-checkout-session')) checkoutRequests++;
    return route.fulfill({ json: { success: true, user, data } });
  });
  await page.goto('/lab/abonnement');
  await expect(page.getByRole('heading', { name: 'Votre abonnement', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Offres', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Accéder à mon espace', exact: true })).toHaveAttribute('href', '/lab');
  await expect(page.getByText('Votre offre', { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Gérer mon abonnement', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Votre abonnement', exact: true })).toBeVisible();
  expect(checkoutRequests).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('laboratory: public pricing keeps a free entry without starting billing', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  let checkouts = 0;
  await page.route('**/api/**', route => {
    if (route.request().url().includes('create-checkout-session')) checkouts++;
    return route.fulfill({ json: { success: true, data: [] } });
  });
  await page.goto('/pour-les-laboratoires/tarifs');
  await expect(page.getByRole('heading', { name: 'Découverte · 0 €/mois', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Démarrer gratuitement', exact: true })).toHaveAttribute('href', '/lab/register');
  await expect(page.getByRole('button', { name: 'Choisir Starter', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choisir Pro', exact: true })).toBeVisible();
  expect(checkouts).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/lab-pricing-free-360.png', fullPage: true });
});

for (const role of ['nurse', 'lab']) {
  test(`${role}: subscription failures cannot masquerade as a free account`, async ({ page }) => {
    const user = { id: `fixture-${role}`, role, first_name: 'Camille', last_name: 'Exemple' };
    await page.setViewportSize({ width: 360, height: 900 });
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [user.role]: true }));
    }, user);
    let fail = true, checkouts = 0;
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
      if (path.endsWith('/stripe/subscription')) return route.fulfill({ json: { success: !fail, data: { id: 'fixture-sub', plan_slug: role === 'nurse' ? 'nurse_pro' : 'lab_pro', status: 'incomplete', current_period_end: '2026-10-15' } } });
      if (path.includes('create-checkout-session')) checkouts++;
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto(`/${role}/abonnement`);
    await expect(page.getByText('Impossible de vérifier votre abonnement', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choisir Pro', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Mon abonnement', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Aucun abonnement actif', exact: true })).not.toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Votre abonnement', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Offres', exact: true }).click();
    await page.getByRole('button', { name: 'Gérer mon abonnement', exact: true }).last().click();
    await expect(page.getByRole('heading', { name: 'Votre abonnement', exact: true })).toBeVisible();
    expect(checkouts).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`${role}: public pricing directs existing subscribers to management`, async ({ page }) => {
    const user = { id: `fixture-${role}`, role, first_name: 'Camille', last_name: 'Exemple' };
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [user.role]: true }));
    }, user);
    let checkouts = 0;
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
      if (path.endsWith('/stripe/subscription')) return route.fulfill({ json: { success: true, data: { id: 'fixture-sub', plan_slug: role === 'nurse' ? 'nurse_pro' : 'lab_pro', status: 'active' } } });
      if (path.includes('create-checkout-session')) checkouts++;
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto(`/pour-les-${role === 'nurse' ? 'infirmiers' : 'laboratoires'}/tarifs`);
    await page.getByRole('button', { name: 'Choisir Pro', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${role}/abonnement$`));
    await expect(page.getByRole('heading', { name: 'Votre abonnement', exact: true })).toBeVisible();
    expect(checkouts).toBe(0);
  });
}

for (const [source, label, target] of [
  ['apple', 'App Store', 'https://apps.apple.com/account/subscriptions'],
  ['google', 'Google Play', 'https://play.google.com/store/account/subscriptions'],
]) {
  test(`nurse: ${source} subscription is managed with its billing provider`, async ({ page }) => {
    const user = { id: 'fixture-nurse', role: 'nurse', first_name: 'Camille', last_name: 'Exemple' };
    await page.addInitScript(user => {
      localStorage.setItem('auth_token', 'local-ui-fixture');
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ nurse: true }));
    }, user);
    let portals = 0;
    await page.route(new URL('/api/**', process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000').href, route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/auth/me')) return route.fulfill({ json: { success: true, user, data: user } });
      if (path.endsWith('/stripe/subscription')) return route.fulfill({ json: { success: true, data: { id: 'fixture-sub', plan_slug: 'nurse_pro', status: 'active', billing_source: source } } });
      if (path.includes('create-portal-session')) portals++;
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.route(target, route => route.fulfill({ contentType: 'text/html', body: '<h1>Gestion fictive</h1>' }));
    await page.goto('/nurse/abonnement');
    await page.getByRole('button', { name: `Gérer sur ${label}`, exact: true }).click();
    await expect(page).toHaveURL(target);
    expect(portals).toBe(0);
  });
}
