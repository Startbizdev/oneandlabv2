import assert from 'node:assert/strict';
import test from 'node:test';
import { ResumableAppointmentBatch } from '../src/resumable-appointment-batch.ts';

test('un échec de copie après création n’efface pas les identifiants créés', async () => {
  const batch = new ResumableAppointmentBatch();
  const creates = [];
  const result = await batch.run(
    'same-form',
    [{ type: 'blood_test' }],
    async (payload, requestId) => {
      creates.push(requestId);
      return 'apt-1';
    },
    async () => {
      throw new Error('Accès refusé au document source ou au rendez-vous');
    },
  );

  assert.equal(result.success, false);
  assert.equal(result.creationComplete, true);
  assert.deepEqual(result.createdIds, ['apt-1']);
  assert.match(result.error ?? '', /Le rendez-vous est créé/);
  assert.equal(creates.length, 1);

  const retry = await batch.run(
    'same-form',
    [{ type: 'blood_test' }],
    async () => {
      throw new Error('ne doit pas recréer');
    },
    async () => {
      throw new Error('Accès refusé au document source ou au rendez-vous');
    },
  );
  assert.equal(retry.creationComplete, true);
  assert.deepEqual(retry.createdIds, ['apt-1']);
  assert.equal(creates.length, 1);
});

test('busy avec ids déjà créés ne les perd pas', async () => {
  const batch = new ResumableAppointmentBatch();
  let releaseCreate;
  const held = new Promise((resolve) => {
    releaseCreate = resolve;
  });
  let markStarted;
  const createStarted = new Promise((resolve) => {
    markStarted = resolve;
  });
  const first = batch.run(
    'busy',
    [{ type: 'blood_test' }],
    async () => {
      markStarted();
      await held;
      return 'apt-busy';
    },
    async () => {},
  );
  await createStarted;
  const concurrent = await batch.run(
    'busy',
    [{ type: 'blood_test' }],
    async () => {
      throw new Error('ne doit pas recréer');
    },
    async () => {},
  );
  assert.equal(concurrent.success, false);
  assert.equal(concurrent.error, 'Création déjà en cours.');
  releaseCreate();
  const done = await first;
  assert.equal(done.success, true);
  assert.deepEqual(done.createdIds, ['apt-busy']);
});

test('waitForAttach false renvoie les ids sans attendre la copie', async () => {
  const batch = new ResumableAppointmentBatch();
  let attachStarted = false;
  let releaseAttach;
  const attachGate = new Promise((resolve) => {
    releaseAttach = resolve;
  });
  const started = Date.now();
  const result = await batch.run(
    'bg-attach',
    [{ type: 'blood_test' }],
    async () => 'apt-1',
    async () => {
      attachStarted = true;
      await attachGate;
    },
    { waitForAttach: false },
  );
  const elapsed = Date.now() - started;
  assert.equal(result.success, true);
  assert.deepEqual(result.createdIds, ['apt-1']);
  assert.ok(elapsed < 200, `navigation bloquée par l’attach (${elapsed}ms)`);
  assert.equal(attachStarted, true);
  releaseAttach();
});

test('busy pendant l’attach conserve les ids déjà créés', async () => {
  const batch = new ResumableAppointmentBatch();
  let releaseAttach;
  const attachHeld = new Promise((resolve) => {
    releaseAttach = resolve;
  });
  let markAttach;
  const attachStarted = new Promise((resolve) => {
    markAttach = resolve;
  });
  const first = batch.run(
    'busy-attach',
    [{ type: 'blood_test' }],
    async () => 'apt-busy',
    async () => {
      markAttach();
      await attachHeld;
    },
  );
  await attachStarted;
  const concurrent = await batch.run(
    'busy-attach',
    [{ type: 'blood_test' }],
    async () => {
      throw new Error('ne doit pas recréer');
    },
    async () => {},
  );
  assert.equal(concurrent.success, false);
  assert.equal(concurrent.error, 'Création déjà en cours.');
  assert.deepEqual(concurrent.createdIds, ['apt-busy']);
  releaseAttach();
  const done = await first;
  assert.equal(done.success, true);
  assert.deepEqual(done.createdIds, ['apt-busy']);
});

test('reprise après création partielle ne recrée pas le premier id', async () => {
  const batch = new ResumableAppointmentBatch();
  let attempts = 0;
  const first = await batch.run(
    'multi',
    [{ id: 'a' }, { id: 'b' }],
    async (payload) => {
      attempts += 1;
      if (payload.id === 'b') throw new Error('réseau');
      return `apt-${payload.id}`;
    },
    async () => {},
  );
  assert.equal(first.success, false);
  assert.equal(first.creationComplete, false);
  assert.deepEqual(first.createdIds, ['apt-a']);

  const second = await batch.run(
    'multi',
    [{ id: 'a' }, { id: 'b' }],
    async (payload) => `apt-${payload.id}`,
    async () => {},
  );
  assert.equal(second.success, true);
  assert.deepEqual(second.createdIds, ['apt-a', 'apt-b']);
  assert.equal(attempts, 2);
});
