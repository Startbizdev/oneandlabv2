import type { Appointment } from '@oneandlab/shared-types';
import { removeSheet, upsertSheet } from '@/components/ui/sheet/sheet-store';
import { fetchAppointment } from '../../api/appointments.service';
import { useOfferQueueStore } from '../offer-queue-store';

jest.mock('../../api/appointments.service', () => ({ fetchAppointment: jest.fn() }));

const fetchMock = jest.mocked(fetchAppointment);

const NURSE = 'nurse-1';

function offer(id: string): Appointment {
  return { id, status: 'pending', type: 'nursing', created_by: null } as unknown as Appointment;
}

function openSheet(id: string) {
  upsertSheet(id, {
    title: 'Sheet',
    content: null,
    disableScroll: false,
    dismissible: true,
    detents: 'fitToContents',
    onRemoved: () => {},
  });
}

beforeEach(() => {
  useOfferQueueStore.getState().reset();
  for (const id of ['a', 'b']) removeSheet(id);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (id: string) => ({ success: true, data: offer(id) }) as never);
});

describe('file des offres et sheets ouvertes', () => {
  it('présente l’offre tout de suite si aucune sheet n’est ouverte', async () => {
    useOfferQueueStore.getState().enqueueMany([offer('o1')]);
    await useOfferQueueStore.getState().processNext('nurse', NURSE);

    const state = useOfferQueueStore.getState();
    expect(state.visible).toBe(true);
    expect(state.awaitingSheet).toBe(false);
    expect(state.selected?.id).toBe('o1');
  });

  it('attend la fermeture de toutes les sheets avant de présenter l’offre', async () => {
    openSheet('a');
    openSheet('b');
    useOfferQueueStore.getState().enqueueMany([offer('o1')]);
    await useOfferQueueStore.getState().processNext('nurse', NURSE);

    expect(useOfferQueueStore.getState()).toMatchObject({ visible: false, awaitingSheet: true });

    removeSheet('a');
    expect(useOfferQueueStore.getState().visible).toBe(false);

    removeSheet('b');
    expect(useOfferQueueStore.getState()).toMatchObject({ visible: true, awaitingSheet: false });
    expect(useOfferQueueStore.getState().selected?.id).toBe('o1');
  });

  it('ne traite pas la file suivante tant qu’une offre attend', async () => {
    openSheet('a');
    useOfferQueueStore.getState().enqueueMany([offer('o1'), offer('o2')]);
    await useOfferQueueStore.getState().processNext('nurse', NURSE);
    fetchMock.mockClear();

    await useOfferQueueStore.getState().processNext('nurse', NURSE);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(useOfferQueueStore.getState().selected?.id).toBe('o1');
  });

  it('closeModal annule l’attente : l’offre ne s’ouvre plus à la fermeture des sheets', async () => {
    openSheet('a');
    useOfferQueueStore.getState().enqueueMany([offer('o1')]);
    await useOfferQueueStore.getState().processNext('nurse', NURSE);

    useOfferQueueStore.getState().closeModal();
    removeSheet('a');

    expect(useOfferQueueStore.getState()).toMatchObject({ visible: false, awaitingSheet: false, selected: null });
  });

  it('openIncomingOffer attend aussi les sheets ouvertes', async () => {
    openSheet('a');
    const result = await useOfferQueueStore.getState().openIncomingOffer('o9', 'nurse', NURSE);

    expect(result).toEqual({ ok: true });
    expect(useOfferQueueStore.getState()).toMatchObject({ visible: false, awaitingSheet: true });

    removeSheet('a');
    expect(useOfferQueueStore.getState().visible).toBe(true);
  });
});
