const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');

function service(get) {
  const file = path.resolve(__dirname, '../apps/mobile/src/features/appointments/api/appointments.service.ts');
  const compiled = new Module(file);
  compiled.require = name => {
    if (name === '@/api/client') return { api: { get } };
    if (name === '@oneandlab/shared-api') return {};
    throw new Error('Unexpected dependency: ' + name);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
  return compiled.exports;
}

(async () => {
  let assertions = 0;
  const filters = { nurse_tab: 'soins', date_from: '2026-09-01 00:00:00', date_to: '2026-09-30 23:59:59' };
  const calls = [];
  const paginated = service(async url => {
    const params = new URL(url, 'http://fixture.invalid').searchParams;
    calls.push(params);
    const page = Number(params.get('page'));
    return { success: true, data: page === 1 ? Array.from({ length: 50 }, (_, n) => ({ id: `fixture-${n}` })) : [{ id: 'fixture-last' }], pagination: { page, limit: 50, total: 51, pages: 2, has_more: page === 1 } };
  });
  const result = await paginated.fetchCalendarAppointments(filters);
  assert.equal(result.length, 51); assertions++;
  assert.equal(result[50].id, 'fixture-last'); assertions++;
  assert.equal(calls.length, 2); assertions++;
  for (const params of calls) {
    for (const [key, value] of Object.entries(filters)) { assert.equal(params.get(key), value); assertions++; }
    assert.equal(params.get('limit'), '50'); assertions++;
  }
  const failed = service(async url => new URL(url, 'http://fixture.invalid').searchParams.get('page') === '1'
    ? { success: true, data: [{ id: 'fixture-first' }], pagination: { pages: 2, has_more: true } }
    : { success: false, error: 'Synthetic unavailable page' });
  await assert.rejects(failed.fetchCalendarAppointments(filters), /Synthetic unavailable/); assertions++;
  const repeated = service(async () => ({ success: true, data: [{ id: 'fixture-repeat' }], pagination: { pages: 3, has_more: true } }));
  await assert.rejects(repeated.fetchCalendarAppointments(filters), /calendrier complet/); assertions++;
  const malformed = service(async () => ({ success: true, data: null }));
  await assert.rejects(malformed.fetchCalendarAppointments(filters), /chargement RDV/); assertions++;
  console.log(`${assertions} native calendar pagination assertions passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
