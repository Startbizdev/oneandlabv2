const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const { QueryClient } = require('@tanstack/query-core');
const file = path.resolve(__dirname, '../apps/mobile/src/features/profile/utils/qualification-save.ts');
const compiled = new Module(file);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, file);
const { qualificationSaveOptions } = compiled.exports;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const tick = () => new Promise(resolve => setImmediate(resolve));

(async () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const cache = client.getMutationCache();
  let account = 'nurse-a';
  let saved;
  const writes = [];
  const first = deferred();
  const options = qualificationSaveOptions(account, () => account, async (id, draft) => {
    writes.push({ id, draft });
    if (draft.others[0] === 'First') await first.promise;
    if (draft.others[0] === 'Refused') throw new Error('API refused');
    saved = draft;
  });
  const draft = text => ({ codes: ['AUTRE'], others: [text] });
  const a = cache.build(client, options).execute(draft('First'));
  await tick();
  const b = cache.build(client, options).execute(draft('Latest'));
  await tick();
  assert.equal(writes.length, 1);
  first.resolve();
  await Promise.all([a, b]);
  assert.equal(writes.length, 2);
  assert.equal(saved.others[0], 'Latest');

  const failed = cache.build(client, options).execute(draft('Refused')).catch(e => e);
  const retry = cache.build(client, options).execute(draft('Retry'));
  assert.match((await failed).message, /API refused/);
  await retry;
  assert.equal(saved.others[0], 'Retry');

  const held = deferred();
  const blocking = cache.build(client, qualificationSaveOptions('nurse-a', () => account, () => held.promise)).execute(draft('Held'));
  await tick();
  const count = writes.length;
  const stale = cache.build(client, options).execute(draft('Stale')).catch(e => e);
  account = 'nurse-b';
  held.resolve();
  await blocking;
  assert.match((await stale).message, /Reconnectez-vous/);
  assert.equal(writes.length, count);
  assert.notEqual(options.scope.id, qualificationSaveOptions('nurse-b', () => account, async () => {}).scope.id);
  client.clear();
  console.log('8 assertions passed: ordered autosaves, recovery after rejection, queued account-switch protection.');
})().catch(error => { console.error(error); process.exitCode = 1; });
