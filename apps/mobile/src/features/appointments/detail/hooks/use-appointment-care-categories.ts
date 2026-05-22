import { useQuery } from '@tanstack/react-query';
import {
  fetchCareCategories,
  type CareCategory,
} from '@/features/categories/api/categories.service';
import { queryKeys } from '@/lib/query-keys';

/** Catalogue nursing + bilan pour libellés d’options soin (détail RDV). */
export function useAppointmentCareCategories() {
  return useQuery({
    queryKey: [...queryKeys.categories.list('nursing'), 'appointment-detail'] as const,
    queryFn: async () => {
      const [nursing, blood] = await Promise.all([
        fetchCareCategories('nursing'),
        fetchCareCategories('blood_test'),
      ]);
      return [...(nursing.data ?? []), ...(blood.data ?? [])] as CareCategory[];
    },
    staleTime: 5 * 60_000,
  });
}
