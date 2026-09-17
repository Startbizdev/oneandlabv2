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

test('une création partielle reste reprise sans modifier le formulaire', async () => {
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
