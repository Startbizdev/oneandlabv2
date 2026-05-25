import { QueryClient } from '@tanstack/react-query';
import { CACHE_STALE_APPOINTMENTS_LIST_MS } from '@oneandlab/shared-constants';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: CACHE_STALE_APPOINTMENTS_LIST_MS,
      gcTime: 24 * 60 * 60_000,
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});
