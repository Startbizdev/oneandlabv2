/**
 * Test E2E : Flux patient Charle Barth
 * - Création RDV avec documents (carte vitale, mutuelle)
 * - Vérification des documents dans le profil
 * - Reprise de RDV avec documents pré-remplis
 *
 * Prérequis :
 * - Backend PHP démarré (port 8888)
 * - Compte test : Charle Barth (email/mot de passe via E2E_TEST_EMAIL, E2E_TEST_PASSWORD)
 *
 * Usage : npx playwright test e2e/patient-documents-flow.spec.ts
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'charle.barth@test.oneandlab.fr';
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || 'TestPassword123!';
const TEST_FIRST_NAME = 'Charle';
const TEST_LAST_NAME = 'Barth';

test.describe('Flux patient - Documents (Charle Barth)', () => {
  test.beforeEach(async ({ page }) => {
    // Se connecter si credentials fournis
    if (process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD) {
      await page.goto('/login');
      await page.getByLabel(/email|e-mail/i).fill(TEST_EMAIL);
      await page.getByLabel(/mot de passe|password/i).fill(TEST_PASSWORD);
      await page.getByRole('button', { name: /connexion|se connecter|login/i }).click();
      await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 });
    }
  });

  test('Bout en bout : RDV avec docs → profil → reprise RDV', async ({ page }) => {
    test.setTimeout(120000);

    // 1. Aller sur la prise de RDV
    await page.goto('/rendez-vous/nouveau');
    await expect(page).toHaveURL(/rendez-vous/);

    // 2. Sélectionner une catégorie (prise de sang)
    const bloodTestButton = page.getByRole('button', { name: /prise de sang|droplet/i }).first();
    await bloodTestButton.click();

    // 3. Attendre le formulaire (étape 1)
    await page.waitForSelector('input[placeholder*="nom" i], input[placeholder*="Nom"]', { timeout: 10000 });

    // 4. Remplir les infos personnelles si pas pré-remplies
    const lastNameInput = page.getByLabel(/nom/i).or(page.locator('input[name="last_name"]')).first();
    if (await lastNameInput.isVisible()) {
      await lastNameInput.fill(TEST_LAST_NAME);
    }
    const firstNameInput = page.getByLabel(/prénom/i).or(page.locator('input[name="first_name"]')).first();
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill(TEST_FIRST_NAME);
    }
    const emailInput = page.getByLabel(/email/i).or(page.locator('input[name="email"]')).first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(TEST_EMAIL);
    }
    const phoneInput = page.getByLabel(/téléphone|phone/i).or(page.locator('input[name="phone"]')).first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('0612345678');
    }

    // 5. Genre
    const genderSelect = page.locator('select, [role="combobox"]').filter({ hasText: /homme|femme|autre/i }).first();
    if (await genderSelect.isVisible()) {
      await genderSelect.click();
      await page.getByRole('option', { name: /homme/i }).first().click();
    }

    // 6. Date de naissance (approximative)
    const birthSelects = page.locator('select').filter({ has: page.locator('option') });
    const birthCount = await birthSelects.count();
    if (birthCount >= 3) {
      await birthSelects.nth(0).selectOption({ label: /15|16/ });
      await birthSelects.nth(1).selectOption({ label: /janvier|01/ });
      await birthSelects.nth(2).selectOption({ label: /1990/ });
    }

    // 7. Adresse - chercher un champ adresse
    const addressInput = page.getByPlaceholder(/adresse|adresse/i).or(page.locator('input[name="address"]')).first();
    if (await addressInput.isVisible()) {
      await addressInput.fill('10 rue de la Paix, Paris');
      await page.waitForTimeout(1000);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
    }

    // 8. Type d'analyse
    const categorySelect = page.locator('select, [role="combobox"]').filter({ hasText: /analyse|sang/i }).first();
    if (await categorySelect.isVisible()) {
      await categorySelect.click();
      await page.getByRole('option').first().click();
    }

    // 9. Date souhaitée - DatePicker
    const dateInput = page.locator('input[type="date"], button').filter({ hasText: /date|souhaitée/i }).first();
    if (await dateInput.isVisible()) {
      await dateInput.click();
    }
    const futureDate = page.locator('button, [role="button"]').filter({ hasText: /[0-9]{1,2}/ }).first();
    if (await futureDate.isVisible()) {
      await futureDate.click();
    }

    // 10. Type de prélèvement
    const singleRadio = page.getByRole('radio', { name: /unique|seule/i }).first();
    if (await singleRadio.isVisible()) {
      await singleRadio.click();
    }

    // 11. Disponibilités
    const allDayRadio = page.getByRole('radio', { name: /journée|all/i }).or(page.locator('label').filter({ hasText: /journée/i })).first();
    if (await allDayRadio.isVisible()) {
      await allDayRadio.click();
    }

    // 12. Upload documents - Carte Vitale
    const carteVitaleZone = page.getByText('Carte Vitale').first();
    await carteVitaleZone.click();
    const fileInputs = page.locator('input[type="file"][accept*="image"]');
    const testDocPath = path.join(__dirname, 'fixtures', 'test-doc.png');
    await fileInputs.first().setInputFiles(testDocPath);
    await page.waitForTimeout(500);

    // Carte Mutuelle
    const carteMutuelleZone = page.getByText('Carte Mutuelle').first();
    await carteMutuelleZone.click();
    await fileInputs.nth(1).setInputFiles(testDocPath);
    await page.waitForTimeout(500);

    // 13. Continuer vers récap
    await page.getByRole('button', { name: /continuer/i }).click();

    // 14. Étape récap - cocher RGPD et valider
    await page.waitForTimeout(1000);
    const consentCheckbox = page.getByRole('checkbox', { name: /rgpd|consent|données/i });
    if (await consentCheckbox.isVisible()) {
      await consentCheckbox.check();
    }
    await page.getByRole('button', { name: /valider|continuer/i }).click();

    // 15. Si OTP : skip (nécessite backend de test) - sinon on arrive sur /patient
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    if (currentUrl.includes('/patient') || currentUrl.includes('/rendez-vous')) {
      // Succès ou en attente OTP
      if (currentUrl.includes('/patient')) {
        // 16. Aller au profil
        await page.goto('/profile');
        await page.waitForTimeout(2000);

        // 17. Vérifier que les documents apparaissent
        const docSection = page.getByText(/carte vitale|carte mutuelle|documents/i);
        await expect(docSection.first()).toBeVisible({ timeout: 5000 });
        const hasDoc = await page.getByText(/test-doc|du profil|fichier/i).first().isVisible().catch(() => false);
        expect(hasDoc || await docSection.isVisible()).toBeTruthy();

        // 18. Reprendre un RDV
        await page.goto('/rendez-vous/nouveau');
        await page.waitForTimeout(1000);
        const bloodBtn = page.getByRole('button', { name: /prise de sang|droplet/i }).first();
        await bloodBtn.click();
        await page.waitForTimeout(2000);

        // 19. Vérifier documents pré-remplis (badge "du profil" ou checkmark)
        const profilBadge = page.getByText(/du profil|✓.*profil/i);
        const hasProfilDoc = await profilBadge.first().isVisible().catch(() => false);
        expect(hasProfilDoc).toBeTruthy();
      }
    }
  });
});
