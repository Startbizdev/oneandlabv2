import { queryClient } from '@/lib/query-client';
import { asyncStoragePersister } from '@/lib/query-persist';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';

/** Vide React Query (persisté) et états locaux liés au compte — à appeler à la déconnexion. */
export async function clearAppSessionCache(): Promise<void> {
  queryClient.clear();
  try {
    await asyncStoragePersister.removeClient();
  } catch {
    /* ignore */
  }
  useOfferQueueStore.getState().reset();
}
