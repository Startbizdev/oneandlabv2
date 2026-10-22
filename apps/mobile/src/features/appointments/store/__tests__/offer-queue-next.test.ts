import type { Appointment } from '@oneandlab/shared-types';
import { fetchAppointment } from '../../api/appointments.service';
import { useOfferQueueStore } from '../offer-queue-store';

jest.mock('../../api/appointments.service', () => ({ fetchAppointment: jest.fn() }));

const fetchMock = jest.mocked(fetchAppointment);
const NOW = new Date().toISOString();

function apt(id: string, batch: string | null): Appointment {
  return {
    id, status: 'pending', type: 'nursing', created_by: 'patient-1', patient_id: 'patient-1',
    created_at: NOW, creation_batch_id: batch, scheduled_at: '2026-10-23T08:00:00',
  } as unknown as Appointment;
}

const ROWS: Record<string, Appointment> = {
  o1: apt('o1', null),
  o2: apt('o2', 'B'),
  o3: apt('o3', 'B'),
};

beforeEach(() => {
  useOfferQueueStore.getState().reset();
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (id: string) => ({ success: true, data: ROWS[id] }) as never);
});

it('après « Plus tard » sur une offre seule, le lot suivant s’ouvre', async () => {
  useOfferQueueStore.getState().enqueueMany(Object.values(ROWS));
  await useOfferQueueStore.getState().processNext('nurse', 'nurse-1');
  expect(useOfferQueueStore.getState().selected?.id).toBe('o1');

  useOfferQueueStore.getState().closeModal();
  await useOfferQueueStore.getState().processNext('nurse', 'nurse-1');

  expect(useOfferQueueStore.getState()).toMatchObject({ visible: true });
  expect(['o2', 'o3']).toContain(useOfferQueueStore.getState().selected?.id);
});

it('une offre acceptée ou refusée ne se rouvre plus (polling, liste, notification)', async () => {
  useOfferQueueStore.getState().markHandled(['o1']);

  useOfferQueueStore.getState().enqueueMany([ROWS.o1]);
  await useOfferQueueStore.getState().processNext('nurse', 'nurse-1');
  expect(useOfferQueueStore.getState().visible).toBe(false);

  const opened = await useOfferQueueStore.getState().openIncomingOffer('o1', 'nurse', 'nurse-1');
  expect(opened.ok).toBe(false);
  expect(useOfferQueueStore.getState().visible).toBe(false);
});

it('une offre acceptée sort de la file même si elle y attendait déjà', async () => {
  useOfferQueueStore.getState().enqueueMany(Object.values(ROWS));
  useOfferQueueStore.getState().markHandled(['o1']);
  await useOfferQueueStore.getState().processNext('nurse', 'nurse-1');
  expect(['o2', 'o3']).toContain(useOfferQueueStore.getState().selected?.id);
});
