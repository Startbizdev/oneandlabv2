import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOOKING_SUBMIT_LIST_FALLBACK,
  resolveBookingSubmitNavigation,
  toBookingClientResult,
  runStaffBookingBatch,
} from '../src/booking-submit-navigation.ts';
import { ResumableAppointmentBatch } from '../src/resumable-appointment-batch.ts';

test('ids + success false → détail (copie 403 / busy)', () => {
  const nav = resolveBookingSubmitNavigation({
    success: false,
    createdIds: ['apt-1'],
    creationComplete: true,
    error: 'Accès refusé. Le rendez-vous est créé, mais certains documents n’ont pas pu être rattachés.',
  });
  assert.equal(nav.kind, 'detail');
  if (nav.kind !== 'detail') throw new Error('expected detail');
  assert.equal(nav.id, 'apt-1');
  assert.match(nav.warning ?? '', /créé/);
});

test('ids + creationComplete → détail', () => {
  const nav = resolveBookingSubmitNavigation({
    success: false,
    createdIds: ['apt-1'],
    creationComplete: true,
  });
  assert.equal(nav.kind, 'detail');
  if (nav.kind === 'detail') assert.equal(nav.id, 'apt-1');
});

test('busy + ids déjà là → détail', () => {
  const nav = resolveBookingSubmitNavigation({
    success: false,
    createdIds: ['apt-busy'],
    error: 'Création déjà en cours.',
  });
  assert.equal(nav.kind, 'detail');
  if (nav.kind === 'detail') assert.equal(nav.id, 'apt-busy');
});

test('succès classique → détail sans warning', () => {
  const nav = resolveBookingSubmitNavigation({
    success: true,
    createdIds: ['apt-ok'],
  });
  assert.deepEqual(nav, { kind: 'detail', id: 'apt-ok' });
});

test('0 id → liste, jamais stay', () => {
  const nav = resolveBookingSubmitNavigation({
    success: false,
    createdIds: [],
    error: 'Délai dépassé',
  });
  assert.equal(nav.kind, 'list');
  if (nav.kind !== 'list') throw new Error('expected list');
  assert.match(nav.message, /Délai dépassé/);
  assert.match(nav.message, new RegExp(BOOKING_SUBMIT_LIST_FALLBACK));
  assert.notEqual(nav.kind, 'stay');
});

test('0 id succès vide → liste filet', () => {
  const nav = resolveBookingSubmitNavigation({ success: true, createdIds: [] });
  assert.equal(nav.kind, 'list');
  if (nav.kind === 'list') assert.equal(nav.message, BOOKING_SUBMIT_LIST_FALLBACK);
});

test('toBookingClientResult ne renvoie jamais un échec wizard s’il y a un id', () => {
  const client = toBookingClientResult({
    success: false,
    createdIds: ['apt-1'],
    error: 'Création déjà en cours.',
  });
  assert.equal(client.success, true);
  assert.equal(client.createdIds[0], 'apt-1');
  assert.equal(client.fallbackList, undefined);
});

test('toBookingClientResult sans id → fallback liste', () => {
  const client = toBookingClientResult({ success: false, createdIds: [] });
  assert.equal(client.success, true);
  assert.equal(client.fallbackList, true);
  assert.deepEqual(client.createdIds, []);
});

test('runStaffBookingBatch : create 200 + attach bloqué → ids tout de suite', async () => {
  const batch = new ResumableAppointmentBatch();
  let attachReleased;
  const attachGate = new Promise((resolve) => {
    attachReleased = resolve;
  });
  const started = Date.now();
  const result = await runStaffBookingBatch(
    batch,
    'form',
    [{ type: 'blood_test' }],
    async () => 'created-apt-1',
    async () => {
      await attachGate;
      throw new Error('Accès refusé');
    },
  );
  assert.ok(Date.now() - started < 200);
  assert.equal(result.success, true);
  assert.deepEqual(result.createdIds, ['created-apt-1']);
  assert.notEqual(result.fallbackList, true);
  attachReleased();
});

test('runStaffBookingBatch : 1er create réseau, 2e replay id → un seul create utile', async () => {
  const batch = new ResumableAppointmentBatch();
  let creates = 0;
  const result = await runStaffBookingBatch(
    batch,
    'retry-form',
    [{ type: 'blood_test' }],
    async (_payload, requestId) => {
      creates += 1;
      if (creates === 1) throw new Error('Délai dépassé');
      return `replay-${requestId.slice(0, 8)}`;
    },
    async () => {},
  );
  assert.equal(creates, 2);
  assert.equal(result.success, true);
  assert.equal(result.createdIds.length, 1);
});

