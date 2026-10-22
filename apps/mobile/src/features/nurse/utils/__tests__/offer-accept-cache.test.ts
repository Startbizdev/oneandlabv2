import { QueryClient, QueryObserver } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { syncCachesAfterOfferAccept } from '../offer-accept-cache';

jest.mock('@/features/tournee-nurse/hooks/nurse-tour-query', () => ({ NURSE_TOUR_QUERY_ROOT: ['nurse-tour'] }));

function apt(status: string): Appointment {
  return { id: 'apt-1', status, type: 'nursing' } as unknown as Appointment;
}

describe('syncCachesAfterOfferAccept', () => {
  let qc: QueryClient;
  const unsubscribes: Array<() => void> = [];

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 120_000, gcTime: Infinity } } });
  });

  afterEach(() => {
    unsubscribes.splice(0).forEach((u) => u());
    qc.clear();
  });

  it('n’attend pas le refetch des listes affichées (préparation bloquée sinon)', async () => {
    const listKey = queryKeys.appointments.infinite({ limit: 20 });
    qc.setQueryData(listKey, { pages: [] });
    const neverEnding = jest.fn(() => new Promise<never>(() => {}));
    const observer = new QueryObserver(qc, { queryKey: listKey, queryFn: neverEnding });
    unsubscribes.push(observer.subscribe(() => {}));

    const fetchDetail = jest.fn(async () => apt('confirmed'));
    await expect(syncCachesAfterOfferAccept(qc, 'apt-1', fetchDetail)).resolves.toBeUndefined();

    expect(neverEnding).toHaveBeenCalled();
    expect(fetchDetail).toHaveBeenCalledWith('apt-1');
  });

  it('recharge la fiche même si elle était en cache (la donnée optimiste ne masque pas le serveur)', async () => {
    const detailKey = queryKeys.appointments.detail('apt-1');
    qc.setQueryData(detailKey, { ...apt('pending'), batch_siblings: [{ id: 'apt-2', status: 'pending' }] });

    const server = { ...apt('confirmed'), batch_siblings: [{ id: 'apt-2', status: 'confirmed' }] } as unknown as Appointment;
    const fetchDetail = jest.fn(async () => server);
    await syncCachesAfterOfferAccept(qc, 'apt-1', fetchDetail);

    expect(fetchDetail).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData(detailKey)).toEqual(server);
  });

  it('garde le statut confirmé optimiste si le rechargement échoue', async () => {
    const detailKey = queryKeys.appointments.detail('apt-1');
    qc.setQueryData(detailKey, apt('pending'));

    await syncCachesAfterOfferAccept(qc, 'apt-1', async () => {
      throw new Error('réseau');
    });

    expect(qc.getQueryData<Appointment>(detailKey)?.status).toBe('confirmed');
  });
});
