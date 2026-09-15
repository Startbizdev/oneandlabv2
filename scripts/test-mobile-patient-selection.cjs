const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const file = path.resolve(__dirname, '../apps/mobile/src/features/appointments/form/utils/patient-selection.ts');
const compiled = new Module(file);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const { PatientSelection } = compiled.exports;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
let checks = 0;
const equal = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
(async () => {
  const requests = new Map();
  const addresses = new Map();
  const applied = [];
  const states = [];
  let clears = 0;
  const selection = new PatientSelection({
    fetch: id => { const job = deferred(); requests.set(id, job); return job.promise; },
    address: patient => { const job = deferred(); addresses.set(patient.id, job); return job.promise; },
    clear: () => { clears++; },
    apply: (patient, address) => applied.push({ id: patient.id, address }),
    state: (loading, error) => states.push({ loading, error }),
  });
  const a = selection.load('a');
  const b = selection.load('b');
  requests.get('b').resolve({ id: 'b' });
  await Promise.resolve();
  addresses.get('b').resolve('Address B');
  await b;
  requests.get('a').resolve({ id: 'a' });
  await a;
  equal(applied, [{ id: 'b', address: 'Address B' }]);
  equal(addresses.has('a'), false);
  equal(clears, 2);
  equal(states.at(-1), { loading: false, error: false });

  const c = selection.load('c');
  requests.get('c').resolve({ id: 'c' });
  await Promise.resolve();
  const d = selection.load('d');
  requests.get('d').resolve({ id: 'd' });
  await Promise.resolve();
  addresses.get('d').resolve('Address D');
  await d;
  addresses.get('c').resolve('Stale address C');
  await c;
  equal(applied.at(-1), { id: 'd', address: 'Address D' });
  equal(applied.length, 2);

  const failed = selection.load('e');
  requests.get('e').reject(new Error('Unavailable'));
  await failed;
  equal(states.at(-1), { loading: false, error: true });
  const retry = selection.load('e');
  equal(states.at(-1), { loading: true, error: false });
  requests.get('e').resolve({ id: 'e' });
  await Promise.resolve();
  addresses.get('e').resolve(null);
  await retry;
  equal(applied.at(-1), { id: 'e', address: null });

  const pending = selection.load('f');
  selection.reset();
  const before = states.length;
  requests.get('f').reject(new Error('Late failure'));
  await pending;
  equal(states.length, before);
  equal(states.at(-1), { loading: false, error: false });
  equal(applied.length, 3);

  const unmounted = selection.load('g');
  selection.invalidate();
  const beforeUnmount = states.length;
  requests.get('g').resolve({ id: 'g' });
  await unmounted;
  equal(states.length, beforeUnmount);
  equal(addresses.has('g'), false);
  console.log(`${checks} assertions passed: latest patient, delayed geocoding, failures and retry, patient reset and unmount.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
