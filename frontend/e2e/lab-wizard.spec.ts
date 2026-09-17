import { expect, test, type Page } from '@playwright/test';
import labBrands from './fixtures/lab-brands.json';

const bloodCategory = {
  id: 'fixture-blood',
  name: 'Prélèvement fixture',
  type: 'blood_test',
  icon: 'droplet',
  options: [],
  is_active: 1,
};

async function mockLabWizardApi(page: Page, user?: Record<string, unknown>) {
  await page.route(/^https?:\/\/[^/]+\/api\//, route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/me')) {
      return route.fulfill({
        json: user
          ? { success: true, user, data: user }
          : { success: false, error: 'Non authentifié' },
      });
    }
    if (url.pathname.endsWith('/categories')) {
      return route.fulfill({ json: { success: true, data: [bloodCategory] } });
    }
    if (url.pathname.endsWith('/public/lab-brands')) {
      return route.fulfill({ json: { success: true, data: labBrands } });
    }
    if (url.pathname.endsWith('/public/provider-name')) {
      return route.fulfill({ json: { success: true, data: { name: 'Prestataire fixture' } } });
    }
    return route.fulfill({ json: { success: true, data: [], pagination: { pages: 1 } } });
  });
}

async function chooseBrandAndVerifyBackForward(page: Page) {
  await expect(page.getByRole('heading', { name: 'Choix du laboratoire', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Choisir un réseau de laboratoires/ }).click();
  const brandButtons = page.locator('button.flex.flex-col[aria-pressed]');
  const biogroup = brandButtons.filter({ has: page.locator('span', { hasText: 'Biogroup' }) });
  await expect(biogroup).toBeVisible();
  await expect(brandButtons).toHaveCount(17);

  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByText('Choisissez votre labo.', { exact: true })).toBeVisible();
  await biogroup.click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Date/ }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choix du laboratoire', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Choisir un réseau de laboratoires/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(biogroup).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Date/ }).first()).toBeVisible();
}

test('patient blood_test ouvert conserve et valide la préférence labo', async ({ page }) => {
  await mockLabWizardApi(page);
  await page.goto('/rendez-vous/nouveau?type=blood_test&category=fixture-blood');
  await chooseBrandAndVerifyBackForward(page);
});

test('staff blood_test conserve et valide la préférence labo', async ({ page }) => {
  const user = { id: 'fixture-admin', role: 'super_admin', first_name: 'Camille', last_name: 'Exemple' };
  await page.addInitScript(user => {
    localStorage.setItem('auth_token', 'local-ui-fixture');
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ super_admin: true }));
  }, user);
  await mockLabWizardApi(page, user);
  await page.goto('/admin/appointments/new');
  await page.getByRole('button', { name: 'Configurer et ajouter Prélèvement fixture', exact: true }).click();
  const validate = page.getByRole('button', { name: 'Valider et ajouter', exact: true });
  if (await validate.isVisible()) await validate.click();
  await page.getByRole('button', { name: 'Continuer', exact: true }).click();
  await chooseBrandAndVerifyBackForward(page);
});

test('une réservation dirigée masque l’étape uniquement pour un laboratoire associé', async ({ page }) => {
  await mockLabWizardApi(page);

  await page.goto('/rendez-vous/nouveau?type=blood_test&category=fixture-blood&provider_id=fixture-nurse&provider_type=nurse');
  await expect(page.getByRole('heading', { name: 'Choix du laboratoire', exact: true })).toBeVisible();

  await page.goto('/rendez-vous/nouveau?type=blood_test&category=fixture-blood&provider_id=fixture-lab&provider_type=lab');
  await expect(page.getByRole('heading', { name: 'Choix du laboratoire', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Date/ }).first()).toBeVisible();
});
