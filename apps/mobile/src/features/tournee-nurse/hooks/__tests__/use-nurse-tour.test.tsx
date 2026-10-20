import { createElement } from 'react';
import renderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fetchNurseTour,
  fetchNurseTourSummary,
  patchNurseTourOrder,
  rescheduleNurseTourStop,
  type NurseTourPayload,
} from '../../api/nurse-tour.service';
import { nurseTourQueryKey } from '../nurse-tour-query';
import { useNurseTour } from '../use-nurse-tour';

jest.mock('../../api/nurse-tour.service', () => ({
  fetchNurseTour: jest.fn(),
  fetchNurseTourSummary: jest.fn(),
  optimizeNurseTour: jest.fn(),
  patchNurseTourOrder: jest.fn(),
  resetNurseTourOrder: jest.fn(),
  rescheduleNurseTourStop: jest.fn(),
}));
jest.mock('../use-tour-origin', () => ({
  useTourOrigin: () => ({ getOrigin: () => null, refreshOrigin: jest.fn() }),
}));
jest.mock('@/lib/hooks/use-app-active', () => ({ useAppActive: () => true }));

const DAY = '2030-01-08';
const OTHER_DAY = '2030-01-15';

function stop(id: string) {
  return { stop_id: id, appointment_id: `apt-${id}`, passage_time_slot: 'morning' };
}

function tour(ids: string[], date = DAY): NurseTourPayload {
  return { date, stops: ids.map(stop) } as unknown as NurseTourPayload;
}

function order(t: NurseTourPayload | undefined): string[] {
  return ((t?.stops ?? []) as unknown as { stop_id: string }[]).map((s) => s.stop_id);
}

type Hook = ReturnType<typeof useNurseTour>;

const mounted: { root: ReactTestRenderer; qc: QueryClient }[] = [];

async function mountHook(qc: QueryClient): Promise<{ current: Hook }> {
  const result = {} as { current: Hook };
  function Harness() {
    result.current = useNurseTour(DAY);
    return null;
  }
  await act(async () => {
    mounted.push({ root: renderer.create(createElement(QueryClientProvider, { client: qc }, createElement(Harness))), qc });
  });
  return result;
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

beforeEach(() => {
  jest.mocked(fetchNurseTour).mockImplementation(async (date: string) => tour(['a', 'b', 'c'], date));
  jest.mocked(fetchNurseTourSummary).mockResolvedValue({});
  jest.mocked(patchNurseTourOrder).mockImplementation(async (_date: string, aptIds: string[]) =>
    tour(aptIds.map((id) => id.replace('apt-', ''))),
  );
});

afterEach(() => {
  for (const { root, qc } of mounted.splice(0)) {
    act(() => root.unmount());
    qc.clear();
  }
  jest.clearAllMocks();
});

describe('useNurseTour', () => {
  it('enchaîne les appuis rapides sur les flèches à partir de l’ordre à jour', async () => {
    const qc = client();
    const hook = await mountHook(qc);

    await act(async () => {
      await Promise.all([hook.current.moveStop('c', 'up'), hook.current.moveStop('c', 'up')]);
    });

    expect(jest.mocked(patchNurseTourOrder).mock.calls.map((call) => call[1])).toEqual([
      ['apt-a', 'apt-c', 'apt-b'],
      ['apt-c', 'apt-a', 'apt-b'],
    ]);
    expect(order(qc.getQueryData(nurseTourQueryKey(DAY)))).toEqual(['c', 'a', 'b']);
  });

  it('après un report, invalide les autres jours et les pastilles du bandeau, pas le jour affiché', async () => {
    const qc = client();
    const hook = await mountHook(qc);
    qc.setQueryData(nurseTourQueryKey(OTHER_DAY), tour(['x'], OTHER_DAY));
    jest.mocked(rescheduleNurseTourStop).mockResolvedValue(tour(['a', 'b']));
    const summaryCalls = jest.mocked(fetchNurseTourSummary).mock.calls.length;

    await act(async () => {
      await hook.current.reschedule('c', { scheduled_at: `${OTHER_DAY} 09:00:00`, availability: 'morning' });
    });

    expect(order(qc.getQueryData(nurseTourQueryKey(DAY)))).toEqual(['a', 'b']);
    expect(qc.getQueryState(nurseTourQueryKey(DAY))?.isInvalidated).toBe(false);
    expect(qc.getQueryState(nurseTourQueryKey(OTHER_DAY))?.isInvalidated).toBe(true);
    // Pastilles du bandeau affichées : invalidées puis rechargées aussitôt.
    expect(jest.mocked(fetchNurseTourSummary).mock.calls.length).toBe(summaryCalls + 1);
  });
});
