const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const file = path.resolve(__dirname, '../frontend/utils/fetch-all-patients.ts');
const compiled = new Module(file);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const { fetchAllPatientsForDashboard } = compiled.exports;
const nativeFile = path.resolve(__dirname, '../apps/mobile/src/features/patients/api/fetch-all-patients.ts');
const nativeModule = new Module(nativeFile);
let nativeFetch;
nativeModule.require = name => name === '@/api/client' ? { api: { get: (...args) => nativeFetch(...args) } } : require(name);
nativeModule._compile(ts.transpileModule(fs.readFileSync(nativeFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, nativeFile);
(async () => {
  for (const fetchAll of [fetchAllPatientsForDashboard, (fetch, extra) => { nativeFetch = fetch; return nativeModule.exports.fetchAllPatients(extra); }]) {
  const calls = [];
  const fetch = async url => {
    const query = new URL(url, 'http://fixture.invalid').searchParams;
    calls.push(query);
    return { success: true, data: query.get('page') === '1' ? [{ id: 'a' }] : [{ id: 'a' }, { id: 'b' }], pagination: { pages: 2 } };
  };
  assert.deepEqual(await fetchAll(fetch, 'search=fixture'), [{ id: 'a' }, { id: 'b' }]);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].get('search'), 'fixture');
  await assert.rejects(fetchAll(async url => url.includes('page=1')
    ? { success: true, data: [{ id: 'a' }], pagination: { pages: 2 } } : { success: false }), /Impossible/);
  await assert.rejects(fetchAll(async () => ({ success: true, data: [], pagination: { pages: 2 } })), /incomplète/);
  await assert.rejects(fetchAll(async () => ({ success: true, data: [null] })), /incomplet/);
  await assert.rejects(fetchAll(async () => ({ success: true, data: [], pagination: { pages: 'invalid' } })), /Pagination/);
  assert.deepEqual(await fetchAll(async () => ({ success: true, data: [] })), []);
  }
  console.log('16 assertions passed: web and mobile complete patient pagination, preserved filters, duplicates, invalid records and failed subsequent pages.');
})().catch(error => { console.error(error); process.exitCode = 1; });
