import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { refetchAppointmentListsOnFocus } from '../use-appointments-cache-sync';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

describe('refetchAppointmentListsOnFocus', () => {
  let qc: QueryClient;
  const unsubscribes: Array<() => void> = [];

  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 120_000, gcTime: Infinity } } });
  });

  afterEach(() => {
    unsubscribes.splice(0).forEach((u) => u());
    qc.clear();
  });

  function activeList(updatedAgoMs: number, now: number) {
    const key = queryKeys.appointments.infinite({ limit: 20, patient_period: 'upcoming' });
    qc.setQueryData(key, { status: 'pending' }, { updatedAt: now - updatedAgoMs });
    const queryFn = jest.fn(async () => ({ status: 'confirmed' }));
    const observer = new QueryObserver(qc, { queryKey: key, queryFn });
    unsubscribes.push(observer.subscribe(() => {}));
    return { key, queryFn };
  }

  it('recharge une liste encore « fraîche » (< staleTime) au retour sur l’écran', async () => {
    const now = Date.now();
    const { key, queryFn } = activeList(30_000, now);

    await refetchAppointmentListsOnFocus(qc, now);

    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(qc.getQueryData(key)).toEqual({ status: 'confirmed' });
  });

  it('ne recharge pas une liste chargée à l’instant', async () => {
    const now = Date.now();
    const { queryFn } = activeList(1_000, now);

    await refetchAppointmentListsOnFocus(qc, now);

    expect(queryFn).not.toHaveBeenCalled();
  });
});
