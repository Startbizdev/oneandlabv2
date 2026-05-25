import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const PERSIST_KEY = 'oneandlab-rq-cache-v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: PERSIST_KEY,
  throttleTime: 2_000,
});

export const persistQueryOptions = {
  persister: asyncStoragePersister,
  maxAge: MAX_AGE_MS,
  dehydrateOptions: {
    shouldDehydrateQuery: (query: { queryKey: readonly unknown[] }) => {
      const root = query.queryKey[0];
      return root === 'appointments' || root === 'categories';
    },
  },
};
