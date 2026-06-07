import { queryKeys } from '@/lib/query-keys';
import { queryClient } from '@/lib/query-client';
import { prefetchAppointmentsForUser } from '@/features/appointments/lib/prefetch-appointments';
import { fetchCareCategories } from '@/features/categories/api/categories.service';
import { fetchUser } from '@/features/profile/api/profile.service';
import { CACHE_STALE_CATEGORIES_MS } from '@oneandlab/shared-constants';

/** Précharge listes RDV + catalogue soins (picker) + profil patient après session. */
export function prefetchAppDataForRole(role: string | undefined, userId?: string | null): void {
  prefetchAppointmentsForUser(role);
  if (!role) return;

  if (role === 'patient' && userId) {
    void queryClient
      .prefetchQuery({
        queryKey: queryKeys.profile.user(userId),
        queryFn: async () => {
          const res = await fetchUser(userId, 'mobile');
          return res.data ?? null;
        },
        staleTime: 60_000,
      })
      .catch(() => undefined);

    void queryClient
      .prefetchQuery({
        queryKey: queryKeys.documents.patient(userId),
        queryFn: async () => {
          const { fetchProfileDocuments } = await import(
            '@/features/patients/api/patient-profile.service'
          );
          const res = await fetchProfileDocuments();
          if (!res.success) throw new Error(res.error ?? 'Erreur chargement documents');
          return res.data ?? [];
        },
        staleTime: 30_000,
      })
      .catch(() => undefined);
  }

  void queryClient
    .prefetchQuery({
      queryKey: queryKeys.categories.list('nursing', 'picker'),
      queryFn: async () => {
        const res = await fetchCareCategories('nursing', 'picker');
        return res.data ?? [];
      },
      staleTime: CACHE_STALE_CATEGORIES_MS,
    })
    .catch(() => undefined);

  void queryClient
    .prefetchQuery({
      queryKey: queryKeys.categories.list('blood_test', 'picker'),
      queryFn: async () => {
        const res = await fetchCareCategories('blood_test', 'picker');
        return res.data ?? [];
      },
      staleTime: CACHE_STALE_CATEGORIES_MS,
    })
    .catch(() => undefined);
}
