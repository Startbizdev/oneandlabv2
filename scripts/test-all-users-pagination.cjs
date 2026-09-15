const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const file = path.resolve(__dirname, '../frontend/utils/fetch-all-users.ts');
let fetchPage;
const compiled = new Module(file);
compiled.require = name => name === '~/utils/api' ? { apiFetch: (...args) => fetchPage(...args) } : require(name);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const { fetchAllUsers } = compiled.exports;

(async () => {
  const requests = [];
  fetchPage = async url => {
    requests.push(new URL(url, 'http://fixture.local'));
    const page = requests.at(-1).searchParams.get('page');
    return { success: true, data: page === '1' ? [{ id: 'a' }, { id: 'b' }] : [{ id: 'b' }, { id: 'c' }], pagination: { pages: 2 } };
  };
  assert.deepEqual(await fetchAllUsers({ role: 'nurse', status: 'active', lab_id: 'lab-fixture' }), [{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].searchParams.get('role'), 'nurse');
  assert.equal(requests[1].searchParams.get('status'), 'active');
  assert.equal(requests[1].searchParams.get('lab_id'), 'lab-fixture');
  fetchPage = async url => new URL(url, 'http://fixture.local').searchParams.get('page') === '1'
    ? { success: true, data: [{ id: 'a' }], pagination: { pages: 2 } }
    : { success: false };
  await assert.rejects(fetchAllUsers(), /Impossible/);
  fetchPage = async () => ({ success: true, data: [], pagination: { pages: 2 } });
  await assert.rejects(fetchAllUsers(), /incomplète/);
  fetchPage = async () => ({ success: true, data: [], pagination: { pages: 1 } });
  assert.deepEqual(await fetchAllUsers(), []);
  fetchPage = async () => ({ success: true, data: null });
  await assert.rejects(fetchAllUsers(), /Impossible/);
  fetchPage = async () => ({ success: true, data: [{ id: 'a' }], pagination: { pages: 'invalid' } });
  await assert.rejects(fetchAllUsers(), /Impossible/);
  console.log('10 assertions passed: complete role pagination, deduplication, empty results and interrupted page failures.');
})().catch(error => { console.error(error); process.exitCode = 1; });
