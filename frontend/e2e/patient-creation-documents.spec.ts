import { test, expect } from '@playwright/test';

for (const role of ['pro', 'lab']) {
  for (const width of [360, 1440]) {
    test(`${role}: patient creation resumes only missing documents at ${width}px`, async ({ page }) => {
      const user = { id: 'fixture-staff', role, first_name: 'Camille', last_name: 'Exemple' };
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(user => {
        localStorage.setItem('auth_token', 'local-ui-fixture');
        localStorage.setItem('auth_user', JSON.stringify(user));
        localStorage.setItem('oneandlab:onboarding-completed', JSON.stringify({ [user.role]: true }));
      }, user);
      let creates = 0, failDocument = true;
      const uploads: string[] = [];
      await page.route('**/api/**', route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        if (path === '/api/patients' && request.method() === 'POST') {
          creates++;
          expect(request.postDataJSON().patient_booking_consent).toBe(true);
          expect(request.postDataJSON().email).toBeUndefined();
          return route.fulfill({ json: { success: true, data: { id: 'fixture-created-patient' } } });
        }
        if (path === '/api/patient-documents/upload') {
          const body = request.postDataBuffer()?.toString() ?? '';
          const type = /name="document_type"\r\n\r\n([^\r]+)/.exec(body)?.[1] ?? '';
          expect(body).toContain('fixture-created-patient');
          uploads.push(type);
          return route.fulfill({ json: type === 'carte_mutuelle' && failDocument
            ? { success: false, error: 'Document indisponible, réessayez.' }
            : { success: true, data: { id: `fixture-${type}` } },
          });
        }
        return route.fulfill({ json: { success: true, user, data: path.endsWith('/auth/me') ? user : [] } });
      });
      await page.goto('/profile?newPatient=1');
      await page.getByRole('textbox', { name: /^Prénom/ }).fill('Louise');
      await page.getByRole('textbox', { name: /^Nom\b/ }).fill('Exemple');
      await page.getByRole('textbox', { name: /^Téléphone/ }).fill('0600000000');
      const files = page.locator('input[type="file"]');
      await files.nth(0).setInputFiles({ name: 'Couverture.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nSynthetic coverage') });
      await files.nth(1).setInputFiles({ name: 'Mutuelle.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\nSynthetic insurance') });
      await expect(page.getByText('Couverture.pdf', { exact: true })).toBeVisible();
      await expect(page.getByText('Mutuelle.pdf', { exact: true })).toBeVisible();
      await page.getByRole('checkbox', { name: /Je confirme que le patient/ }).check();
      await page.getByRole('button', { name: 'Créer le patient', exact: true }).click();
      await expect(page.getByText('Document indisponible, réessayez.', { exact: true })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /^Prénom/ })).toBeDisabled();
      expect(creates).toBe(1);
      expect(uploads).toEqual(['carte_vitale', 'carte_mutuelle']);
      await expect(page).toHaveURL(/\/profile\?newPatient=1/);
      await page.screenshot({ path: `test-results/patient-document-retry-${role}-${width}.png`, fullPage: true });
      failDocument = false;
      await page.getByRole('button', { name: 'Terminer le dossier', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${role}/appointments/new\\?patient_id=fixture-created-patient`));
      expect(creates).toBe(1);
      expect(uploads).toEqual(['carte_vitale', 'carte_mutuelle', 'carte_mutuelle']);
    });
  }
}
