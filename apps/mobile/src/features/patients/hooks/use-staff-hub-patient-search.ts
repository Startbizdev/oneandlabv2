import { useQuery } from '@tanstack/react-query';
import type { StaffHubPatientItem, StaffHubSearchItem } from '@oneandlab/shared-types';
import { fetchStaffPatientHubSearch } from '../api/staff-hub-search.service';
import { queryKeys } from '@/lib/query-keys';

function patientsOnly(items: StaffHubSearchItem[]): StaffHubPatientItem[] {
  return items.filter((item): item is StaffHubPatientItem => item.kind === 'patient');
}

/**
 * Patients du soignant correspondant à la recherche (`GET /search`, entrées `kind = patient`).
 * Le cache garde la réponse complète, partagée avec la liste Patients qui affiche toutes les entrées.
 */
export function useStaffHubPatientSearch(search: string) {
  const q = search.trim();
  return useQuery({
    queryKey: queryKeys.patients.hubSearch(q),
    queryFn: async () => {
      const res = await fetchStaffPatientHubSearch(q);
      if (!res.success) throw new Error(res.error ?? 'Recherche impossible');
      return res.data?.items ?? [];
    },
    select: patientsOnly,
    staleTime: 15_000,
  });
}
