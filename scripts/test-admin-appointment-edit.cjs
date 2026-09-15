const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
function load(relative) {
  const file = path.resolve(__dirname, '../frontend', relative + '.ts');
  const compiled = new Module(file);
  compiled.require = name => name.startsWith('~/') ? load(name.slice(2)) : require(name);
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
  return compiled.exports;
}
const { hydrateAdminUnifiedAppointment: hydrate } = load('utils/admin-unified-appointment-hydrate');
const { extractUnifiedPayloadFiles: files, buildAdminAppointmentPutBody: put } = load('utils/admin-unified-appointment-put');
const appointment = { type: 'nursing', address: '10 rue Exemple', location_lat: 48.86, location_lng: 2.34, scheduled_at: '2027-10-15 08:00:00', category_id: 'fixture-category', form_data: { first_name: 'Louise', availability: { type: 'custom', range: [8, 10] }, care_options: { detail: 'Conservé' }, duration_days: '7', frequency: 'once_daily' } };
const result = hydrate(appointment, []);
assert.deepEqual(result.formData.address, { label: appointment.address, lat: 48.86, lng: 2.34 });
assert.equal(result.formData.first_name, 'Louise');
const service = result.formData.formDataByService[result.selectedServices[0].id];
assert.deepEqual(service.availabilityRange, [8, 10]);
assert.equal(service.availability_type, 'custom');
assert.equal(service.care_options.detail, 'Conservé');
assert.equal(service.duration_days, '7');
assert.equal(service.frequency, 'once_daily');
assert.equal(service.scheduled_at, '2027-10-15');
const old = hydrate({ ...appointment, form_data: JSON.stringify(appointment.form_data) }, []);
assert.deepEqual(old.formData, result.formData);
const first = new File(['fixture'], 'first.pdf');
const second = new File(['fixture'], 'second.pdf');
assert.deepEqual(files({ form_data: { files: { ordonnance: first } } }), { ordonnance: first });
assert.deepEqual(files({ form_data: { files: { ordonnance: first } }, files: { ordonnance: second } }), { ordonnance: second });
assert.deepEqual(files({ files: { ordonnance: { name: 'metadata.pdf' } } }), {});
const body = put({ selectedServices: [{ id: 'one', type: 'nursing', category_id: 'category-a', name: 'Injection' }, { id: 'two', type: 'nursing', category_id: 'category-b', name: 'Pansement' }], form_data: { first_name: 'Louise' }, formDataByService: { one: { care_options: { dose: 2 } }, two: { care_options: { detail: 'Conservé' } } } }, { status: 'confirmed' });
assert.deepEqual(body.form_data.nursing_items.map(item => item.category_id), ['category-a', 'category-b']);
assert.deepEqual(body.form_data.nursing_items[0].care_options, { dose: 2 });
assert.deepEqual(body.form_data.nursing_items[1].care_options, { detail: 'Conservé' });
assert.equal(body.form_data.first_name, 'Louise');
for (const timezone of ['Europe/Paris', 'Asia/Dubai', 'America/New_York']) {
  process.env.TZ = timezone;
  assert.equal(put({ scheduled_at: '2027-10-15 08:00:00' }, { status: 'confirmed' }).scheduled_at, '2027-10-15 08:00:00');
}
console.log('19 assertions passed: admin hydration, clinical acts, documents and browser-independent scheduling.');
