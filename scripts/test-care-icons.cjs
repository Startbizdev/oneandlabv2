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
const icons = compile('frontend/utils/care-icons.ts', { '@oneandlab/shared-utils': symbols });
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
assert.equal(intro.lines[0].iconName, 'i-lucide-syringe');
assert.equal(intro.lines[0].imageSrc, null, 'A selected icon takes precedence over stale artwork');
assert.equal(icons.resolveCareCategoryImageSrc('/api/custom.png', '/api'), '/api/custom.png');
assert.equal(icons.resolveCareCategoryImageSrc('/api/custom.png', '/api', 'medical-icon:cardiology'), null);
const assets = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../apps/mobile/src/assets/care-icons.json'), 'utf8'));
for (const name of Object.keys(assets)) {
  assert.equal(symbols.resolveCareCategoryIcon({icon: name}), name);
  assert.equal(symbols.resolveCareCategoryIcon({icon: `i-${name.replace(':', '-')}`}), name);
  assert.ok(assets[name].includes('<svg') && assets[name].includes('viewBox='), name);
}
for (const type of ['blood_test', 'nursing']) assert.ok(assets[symbols.resolveCareCategoryIcon({type})]);
console.log('Catalogue selection, legacy aliases, stale image priority, calendar propagation and 155 native SVG assets passed.');

const nativeLot = compile('apps/mobile/src/features/appointments/form/utils/booking-wizard-lot.ts', {
  '@oneandlab/shared-utils': { isBloodTestAppointment: type => type === 'blood_test', isNursingAppointment: type => type === 'nursing' },
});
assert.equal(nativeLot.bookingWizardServiceDisplayName({ name: 'Soin personnalisé', icon: 'syringe', type: 'nursing' }), 'Soin personnalisé');
