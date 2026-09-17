import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  applyLabPreferenceToBloodPayloads,
  bloodTestNeedsLabPreferenceStep,
  directedProviderBookingHasLaboratory,
  validateLabPreferenceBeforeSubmit,
} from '../src/lab-preference.ts';

const blood = [{ id: 'blood-1', type: 'blood_test' }];
const nursing = [{ id: 'nursing-1', type: 'nursing' }];

test('les parcours patient et staff ouverts affichent la préférence labo', () => {
  assert.equal(bloodTestNeedsLabPreferenceStep(blood), true);
  assert.equal(bloodTestNeedsLabPreferenceStep(nursing), false);
  assert.equal(bloodTestNeedsLabPreferenceStep([...nursing, ...blood]), true);
});

test('seule une réservation dirigée vers un laboratoire masque l’étape', () => {
  assert.equal(directedProviderBookingHasLaboratory('provider-1', 'lab'), true);
  assert.equal(directedProviderBookingHasLaboratory('provider-1', 'nurse'), false);
  assert.equal(directedProviderBookingHasLaboratory('provider-1', 'pro'), false);
  assert.equal(directedProviderBookingHasLaboratory('', 'lab'), false);
  assert.equal(
    bloodTestNeedsLabPreferenceStep(blood, {
      skipForProviderBooking: directedProviderBookingHasLaboratory('provider-1', 'lab'),
    }),
    false,
  );
});

test('le mode et la marque sont validés puis copiés dans le payload blood_test', () => {
  assert.match(validateLabPreferenceBeforeSubmit(blood, '', null) ?? '', /Indiquez/);
  assert.match(validateLabPreferenceBeforeSubmit(blood, 'brand_choice', null) ?? '', /Choisissez/);
  assert.equal(validateLabPreferenceBeforeSubmit(blood, 'platform_match', null), null);
  assert.equal(validateLabPreferenceBeforeSubmit(blood, 'brand_choice', 'brand-17'), null);

  const [payload] = applyLabPreferenceToBloodPayloads(
    [{ type: 'blood_test', form_data: { existing: true } }],
    { lab_preference_mode: 'brand_choice', preferred_lab_brand_id: 'brand-17' },
  );
  assert.equal(payload.lab_preference_mode, 'brand_choice');
  assert.equal(payload.preferred_lab_brand_id, 'brand-17');
  assert.deepEqual(payload.form_data, {
    existing: true,
    lab_preference_mode: 'brand_choice',
    preferred_lab_brand_id: 'brand-17',
  });
});

test('les hooks mobile conservent un état unique et partagent validation/payload', async () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const bookingWizard = await readFile(
    `${root}/apps/mobile/src/features/appointments/form/hooks/useBookingWizard.ts`,
    'utf8',
  );
  const appointmentForm = await readFile(
    `${root}/apps/mobile/src/features/appointments/form/hooks/useAppointmentForm.ts`,
    'utf8',
  );

  assert.match(bookingWizard, /useState<LabPreferenceMode \| ''>\('platform_match'\)/);
  assert.match(bookingWizard, /if \(needsLabPreferenceStep\) \{\s*setStep\(1\)/);
  assert.match(bookingWizard, /setStep\(needsLabPreferenceStep \? 1 : formWizardStep\)/);
  assert.match(bookingWizard, /getLabPreference: \(\) => \(\{/);
  assert.match(appointmentForm, /validateLabPreferenceBeforeSubmit\(/);
  assert.match(appointmentForm, /buildDashboardAppointmentPayloads\(/);
});

test('la fixture locale respecte le contrat réel des 17 réseaux publics', async () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const fixture = JSON.parse(
    await readFile(`${root}/frontend/e2e/fixtures/lab-brands.json`, 'utf8'),
  );
  const migration = await readFile(`${root}/database/migrations/101_lab_brands.sql`, 'utf8');
  const apiModel = await readFile(`${root}/backend/models/LabBrand.php`, 'utf8');

  assert.equal(fixture.length, 17);
  assert.equal(new Set(fixture.map((brand) => brand.id)).size, 17);
  assert.equal(new Set(fixture.map((brand) => brand.slug)).size, 17);
  assert.deepEqual(fixture.map((brand) => brand.sort_order), Array.from({ length: 17 }, (_, i) => i + 1));
  for (const brand of fixture) {
    assert.match(brand.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.match(migration, new RegExp(`'${brand.id.replaceAll('-', '\\-')}'`));
    assert.deepEqual(Object.keys(brand), [
      'id',
      'name',
      'slug',
      'logo_url',
      'website_url',
      'sort_order',
    ]);
  }
  assert.match(apiModel, /SELECT id, name, slug, logo_url, website_url, sort_order/);
  assert.match(apiModel, /WHERE is_active = 1/);
  assert.match(apiModel, /ORDER BY sort_order ASC, name ASC/);
});
