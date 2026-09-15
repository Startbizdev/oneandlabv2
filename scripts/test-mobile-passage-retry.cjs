const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const file = path.resolve(__dirname, '../apps/mobile/src/features/nurse-passage/utils/passage-creation-attempt.ts');
const compiled = new Module(file);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { PassageCreationAttempt } = compiled.exports;

(async () => {
  let creates = 0, uploads = 0;
  const input = { patient_id: 'patient', notes: 'Preserved', nursing_items: [{ category_id: 'care' }] };
  const attempt = new PassageCreationAttempt();
  const create = async () => { creates++; return { created_appointments: 3, appointment_ids: ['one', 'two', 'three'] }; };
  await assert.rejects(attempt.run(input, create, async () => { uploads++; throw new Error('Upload failed'); }), /Les passages sont créés/);
  assert.equal(creates, 1);
  assert.equal(uploads, 1);
  await assert.rejects(attempt.run({ ...input, patient_id: 'another' }, create, async () => {}), /déjà créés/);
  assert.equal(creates, 1);
  assert.equal(uploads, 1);
  const result = await attempt.run(input, create, async result => {
    uploads++;
    assert.deepEqual(result.appointment_ids, ['one', 'two', 'three']);
  });
  assert.equal(result.created_appointments, 3);
  assert.equal(creates, 1);
  assert.equal(uploads, 2);
  await attempt.run({ ...input, notes: 'New demand' }, create, async () => {});
  assert.equal(creates, 2);

  const failed = new PassageCreationAttempt();
  await assert.rejects(failed.run(input, async () => { throw new Error('Create failed'); }, async () => {}), /Create failed/);
  await failed.run({ ...input, notes: 'Changed before creation' }, create, async () => {});
  assert.equal(creates, 3);

  const busy = new PassageCreationAttempt();
  let finish;
  const pending = busy.run(input, () => new Promise(resolve => { finish = resolve; }), async () => {});
  await assert.rejects(busy.run(input, create, async () => {}), /déjà en cours/);
  finish({ created_appointments: 1, appointment_ids: ['unique'] });
  assert.deepEqual((await pending).appointment_ids, ['unique']);
  console.log('15 native passage retry assertions passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
