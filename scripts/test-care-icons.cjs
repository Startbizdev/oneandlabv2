const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
function compile(relative, dependencies = {}) {
  const file = path.resolve(__dirname, '..', relative);
  const mod = new Module(file);
  mod.require = name => dependencies[name] ?? require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
  return mod.exports;
}
const symbols = compile('packages/shared-utils/src/care-symbol.ts');
const artwork = compile('packages/shared-utils/src/care-artwork.ts');
const icons = compile('frontend/utils/care-icons.ts', { '@oneandlab/shared-utils': { ...symbols, ...artwork } });
for (const [icon, expected] of [
  ['syringe', 'i-lucide-syringe'], ['lucide:syringe', 'i-lucide-syringe'],
  ['i-lucide-bandage', 'i-lucide-bandage'], ['medical-icon:cardiology', 'i-medical-icon-cardiology'],
  ['healthicons:nurse', 'i-healthicons-nurse'], ['covid:virus', 'i-covid-virus'],
  ['pulse', 'i-lucide-activity'], ['first-aid', 'i-lucide-briefcase-medical'],
  ['🩺', 'i-lucide-droplet'], ['', 'i-lucide-droplet'],
]) assert.equal(icons.resolveCareIconFromCategory({ type: 'blood_test', icon }), expected);
const badge = icons.careListBadgeDisplay({ category_id: 'care', type: 'blood_test' }, [
  { id: 'care', type: 'blood_test', icon: '🩺', image_url: '/api/custom.png' },
], undefined, '/api');
assert.equal(badge.imageSrc, '/api/custom.png', 'A legacy emoji cannot hide a custom image');
const segment = compile('frontend/utils/booking-wizard-segment.ts', {
  '~/utils/care-icons': icons,
  '~/utils/appointment-type-rules': { isBloodTestAppointment: type => type === 'blood_test', isNursingAppointment: type => type === 'nursing' },
  '@oneandlab/shared-utils': { careCategoryEmojiForCategory: () => '', isCareCategoryEmoji: () => false },
});
const intro = segment.buildBookingWizardSegmentIntro([{ id: 'a', type: 'blood_test', name: 'Exemple', icon: 'syringe', category_image_url: '/api/custom.png' }], 'a', '/api');
assert.equal(intro.lines[0].iconName, 'i-lucide-syringe', 'The selected icon stays the fallback pictogram');
assert.equal(intro.lines[0].imageSrc, '/api/custom.png', 'A selected icon cannot hide the uploaded image');
assert.equal(icons.resolveCareCategoryImageSrc('/api/custom.png', '/api'), '/api/custom.png');

for (const key of artwork.CARE_ARTWORK_KEYS) {
  assert.equal(artwork.careArtworkKey({ name: key, type: 'nursing' }), key);
  assert.ok(fs.statSync(path.resolve(__dirname, '../frontend/public/images/care', `${key}.webp`)).size > 0, `web ${key}`);
  assert.ok(fs.statSync(path.resolve(__dirname, '../apps/mobile/src/assets/care-art', `${key}.png`)).size > 0, `mobile ${key}`);
}
const nativeArtworkMap = fs.readFileSync(path.resolve(__dirname, '../apps/mobile/src/constants/care-artwork-images.ts'), 'utf8');
for (const key of artwork.CARE_ARTWORK_KEYS) assert.ok(nativeArtworkMap.includes(`care-art/${key}.png`), `native map ${key}`);
for (const [name, type, expected] of [
  ['Prise de sang', 'blood_test', 'prise-de-sang'], ['Soins d’hygiène', 'nursing', 'soins-d-hygiene'],
  ['Retrait de points / agrafes', 'nursing', 'retrait-de-points-agrafes'], ['Suivi diabète', 'nursing', 'suivi-diabete'],
  ['Examen des urines', 'blood_test', 'examen-des-urines'], ['Pansement', 'nursing', 'pansement-plaie'],
  ['Toilette / soins d\'hygiène', 'nursing', 'soins-d-hygiene'], ['Bilan complet', 'blood_test', 'bilan-sanguin'],
  ['Prélèvement', 'blood_test', 'prise-de-sang'], ['Analyse inconnue', 'blood_test', 'prise-de-sang'],
  ['Soin inconnu', 'nursing', 'soins-infirmiers'], ['', null, 'soins-infirmiers'],
  ['Bilan d\'anesthésie', 'blood_test', 'bilan-d-anesthesie'], ['Bilan de coagulation', 'blood_test', 'bilan-de-coagulation'],
  ['Bilan hépatique', 'blood_test', 'bilan-hepatique'], ['Bilan inflammatoire', 'blood_test', 'bilan-inflammatoire'],
  ['Bilan lipidique', 'blood_test', 'bilan-lipidique'], ['Bilan martial', 'blood_test', 'bilan-martial'],
  ['Bilan pré-opératoire', 'blood_test', 'bilan-pre-operatoire'], ['Bilan rénal', 'blood_test', 'bilan-renal'],
  ['Bilan thyroïdien', 'blood_test', 'bilan-thyroidien'], ['Bilan vitaminique', 'blood_test', 'bilan-vitaminique'],
  ['Cholestérol', 'blood_test', 'cholesterol'], ['CRP', 'blood_test', 'crp'],
  ['Dépistage (VIH, hépatites)', 'blood_test', 'depistage-vih-hepatites'], ['Fer / Ferritine', 'blood_test', 'fer-ferritine'],
  ['Glycémie', 'blood_test', 'glycemie'], ['Glycémie à jeun', 'blood_test', 'glycemie-a-jeun'],
  ['HbA1c', 'blood_test', 'hba1c'], ['Hormones', 'blood_test', 'hormones'],
  ['Marqueurs tumoraux', 'blood_test', 'marqueurs-tumoraux'], ['NFS', 'blood_test', 'nfs'],
  ['Sérologie', 'blood_test', 'serologie'], ['Triglycérides', 'blood_test', 'triglycerides'],
  ['Vitamines', 'blood_test', 'vitamines'], ['Aide aux repas', 'nursing', 'aide-aux-repas'],
  ['Chimiothérapie à domicile', 'nursing', 'chimiotherapie-a-domicile'], ['Garde / surveillance nuit', 'nursing', 'garde-surveillance-nuit'],
  ['Injection intramusculaire', 'nursing', 'injection-intramusculaire'], ['Injection sous-cutanée', 'nursing', 'injection-sous-cutanee'],
  ['Mesure tension / glycémie', 'nursing', 'mesure-tension-glycemie'], ['Pansement complexe', 'nursing', 'pansement-complexe'],
  ['Pose de cathéter', 'nursing', 'pose-de-catheter'], ['Prélèvement urinaire', 'nursing', 'prelevement-urinaire'],
  ['Rééducation', 'nursing', 'reeducation'], ['Soins à la personne', 'nursing', 'soins-a-la-personne'],
  ['Soins de plaies', 'nursing', 'soins-de-plaies'], ['Soins de sonde', 'nursing', 'soins-de-sonde'],
  ['Soins post-opératoires', 'nursing', 'soins-post-operatoires'],
]) assert.equal(artwork.careArtworkKey({ name, type }), expected, name);
const vaccination = { name: 'Vaccination', type: 'nursing' };
assert.equal(icons.resolveCareCategoryImageSrc(null, '/api', vaccination), '/images/care/vaccination.webp', 'The 3D artwork is the default');
assert.equal(icons.resolveCareCategoryImageSrc('/api/custom.png', '/api', vaccination), '/api/custom.png', 'An uploaded image wins over the artwork');
const iconBadge = icons.careListBadgeDisplay({ category_id: 'v', type: 'nursing' }, [{ id: 'v', name: 'Vaccination', type: 'nursing', icon: 'syringe' }], undefined, '/api');
assert.equal(iconBadge.imageSrc, '/images/care/vaccination.webp', 'A seeded catalogue icon cannot hide the artwork');
assert.equal(iconBadge.iconName, 'i-lucide-syringe');
assert.equal(icons.resolveCareCategoryImageSrc(null, '/api'), null);
const artworkBadge = icons.careListBadgeDisplay({ category_id: 'v', type: 'nursing' }, [{ id: 'v', name: 'Vaccination', type: 'nursing', icon: '💉' }], undefined, '/api');
assert.equal(artworkBadge.imageSrc, '/images/care/vaccination.webp');
console.log(`${artwork.CARE_ARTWORK_KEYS.length} 3D care artworks (web + mobile), name aliases and display priority passed.`);
for (const name of ['lucide:syringe', 'lucide:heart-pulse', 'medical-icon:cardiology', 'healthicons:nurse', 'covid:vaccine-protection-syringe']) {
  assert.equal(symbols.resolveCareCategoryIcon({icon: name}), name);
  assert.equal(symbols.resolveCareCategoryIcon({icon: `i-${name.replace(':', '-')}`}), name);
}
assert.equal(symbols.resolveCareCategoryIcon({type: 'blood_test'}), 'lucide:droplet');
assert.equal(symbols.resolveCareCategoryIcon({type: 'nursing'}), 'lucide:stethoscope');
console.log('Catalogue selection, legacy aliases, stale image priority and calendar propagation passed.');

const nativeLot = compile('apps/mobile/src/features/appointments/form/utils/booking-wizard-lot.ts', {
  '@oneandlab/shared-utils': { isBloodTestAppointment: type => type === 'blood_test', isNursingAppointment: type => type === 'nursing' },
});
assert.equal(nativeLot.bookingWizardServiceDisplayName({ name: 'Soin personnalisé', icon: 'syringe', type: 'nursing' }), 'Soin personnalisé');
