import type { QueryClient } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { NURSE_TOUR_QUERY_ROOT } from '@/features/tournee-nurse/hooks/nurse-tour-query';

/**
 * Après acceptation d'une offre : seule la fiche ouverte ensuite est attendue.
 * Listes, tournée, patients et quota se rafraîchissent en arrière-plan : attendre leur refetch
 * (toutes les pages chargées de chaque liste) bloquait l'écran de préparation.
 */
export async function syncCachesAfterOfferAccept(
  qc: QueryClient,
  acceptedId: string,
  fetchDetail: (id: string) => Promise<Appointment>,
): Promise<void> {
  const detailKey = queryKeys.appointments.detail(acceptedId);
  qc.setQueryData<Appointment>(detailKey, (prev) => (prev ? { ...prev, status: 'confirmed' } : prev));

  void Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.appointments.all }),
    qc.invalidateQueries({ queryKey: queryKeys.patients.all }),
    qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT }),
    qc.invalidateQueries({ queryKey: queryKeys.planLimits.current }),
  ]).catch((error: unknown) => {
    console.warn('[offer] rafraîchissement après acceptation incomplet', error);
  });

  // staleTime 0 : la donnée optimiste vient d'être écrite, sans cela le préchargement serait ignoré.
  await qc.prefetchQuery({
    queryKey: detailKey,
    queryFn: () => fetchDetail(acceptedId),
    staleTime: 0,
  });
}
