const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const ts = require('typescript');
const file = path.resolve(__dirname, '../apps/mobile/src/features/nurse-passage/utils/passage-creation-attempt.ts');
const compiled = new Module(file);
compiled._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { PassageCreationAttempt } = compiled.exports;

let requestSeq = 0;
const newRequestId = () => `request-${++requestSeq}`;

(async () => {
  let creates = 0, uploads = 0;
  const sentRequestIds = [];
  const input = { patient_id: 'patient', notes: 'Preserved', nursing_items: [{ category_id: 'care' }] };
  const attempt = new PassageCreationAttempt(newRequestId);
  const create = async (sent) => { creates++; sentRequestIds.push(sent.client_request_id); return { created_appointments: 3, appointment_ids: ['one', 'two', 'three'] }; };
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
  assert.notEqual(sentRequestIds[1], sentRequestIds[0]);

  const failed = new PassageCreationAttempt(newRequestId);
  const lostResponse = async (sent) => { sentRequestIds.push(sent.client_request_id); throw new Error('Create failed'); };
  await assert.rejects(failed.run(input, lostResponse, async () => {}), /Create failed/);
  await failed.run(input, create, async () => {});
  assert.equal(creates, 3);
  assert.equal(sentRequestIds[3], sentRequestIds[2]);
  await failed.run({ ...input, notes: 'Changed after creation' }, create, async () => {});
  assert.notEqual(sentRequestIds[4], sentRequestIds[3]);

  const busy = new PassageCreationAttempt(newRequestId);
  let finish;
  const pending = busy.run(input, () => new Promise(resolve => { finish = resolve; }), async () => {});
  await assert.rejects(busy.run(input, create, async () => {}), /déjà en cours/);
  finish({ created_appointments: 1, appointment_ids: ['unique'] });
  assert.deepEqual((await pending).appointment_ids, ['unique']);
  console.log('18 native passage retry assertions passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
