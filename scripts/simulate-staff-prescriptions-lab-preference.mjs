#!/usr/bin/env node
/** Simulation inline — ordonnances pro + marque labo staff (sans build TS). */

let failures = 0;
function ok(cond, label) {
  if (cond) {
    console.log(`✅ ${label}`);
    return;
  }
  failures++;
  console.log(`❌ ${label}`);
}

function resolvePrescriptionKindForRole(role) {
  return role === 'nurse' || role === 'pro' ? 'nursing' : 'medical';
}

function bloodTestNeedsLabPreferenceStep(services) {
  return services.some((s) => s.type === 'blood_test');
}

function validateLabPreferenceBeforeSubmit(services, mode, brandId) {
  if (!bloodTestNeedsLabPreferenceStep(services)) return null;
  if (mode !== 'platform_match' && mode !== 'brand_choice') {
    return 'Mode requis';
  }
  if (mode === 'brand_choice' && !brandId) return 'Marque requise';
  return null;
}

function shouldAutoAssignCreatorLab(formData) {
  return formData.lab_preference_mode !== 'brand_choice';
}

console.log('=== Simulation ordonnances + marque labo staff ===\n');

ok(resolvePrescriptionKindForRole('pro') === 'nursing', 'Pro → ordonnance nursing');
ok(resolvePrescriptionKindForRole('nurse') === 'nursing', 'Infirmier → ordonnance nursing');

const blood = [{ type: 'blood_test' }];
ok(bloodTestNeedsLabPreferenceStep(blood), 'Prélèvement → étape marque labo (staff)');
ok(validateLabPreferenceBeforeSubmit(blood, 'brand_choice', null) !== null, 'brand_choice sans marque → erreur');
ok(validateLabPreferenceBeforeSubmit(blood, 'brand_choice', 'uuid') === null, 'brand_choice + marque → OK');

ok(shouldAutoAssignCreatorLab({ lab_preference_mode: 'platform_match' }), 'Lab platform_match → auto-assign');
ok(!shouldAutoAssignCreatorLab({ lab_preference_mode: 'brand_choice' }), 'Lab brand_choice → pas auto-assign');

console.log('\n--- Résultat ---');
if (failures === 0) {
  console.log('Tous les tests OK.');
  process.exit(0);
}
console.log(`${failures} échec(s).`);
process.exit(1);
