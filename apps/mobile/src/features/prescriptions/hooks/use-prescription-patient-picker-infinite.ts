import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { CACHE_STALE_APPOINTMENTS_LIST_MS } from '@oneandlab/shared-constants';
import { fetchPatientsPaginated } from '@/features/patients/api/fetch-patients-paginated';
import { PRESCRIPTION_PATIENT_PAGE_SIZE } from '../constants';

type Page = Awaited<ReturnType<typeof fetchPatientsPaginated>>;

export function usePrescriptionPatientPickerInfinite(enabled = true) {
  return useInfiniteQuery({
    queryKey: ['prescriptions', 'patients', 'infinite'] as const,
    queryFn: async ({ pageParam = 1 }) =>
      fetchPatientsPaginated(pageParam, PRESCRIPTION_PATIENT_PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const page = lastPage.pagination.page ?? 1;
      const pages = lastPage.pagination.pages ?? 1;
      return page < pages ? page + 1 : undefined;
    },
    enabled,
    staleTime: CACHE_STALE_APPOINTMENTS_LIST_MS,
    placeholderData: keepPreviousData,
  });
}

export function flattenPrescriptionPickerPatients(pages: Page[] | undefined) {
  if (!pages?.length) return [];
  const seen = new Set<string>();
  const out: Page['patients'][number][] = [];
  for (const page of pages) {
    for (const p of page.patients) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

export function prescriptionPatientPickerTotalCount(pages: Page[] | undefined): number {
  const first = pages?.[0];
  return first?.pagination.total ?? flattenPrescriptionPickerPatients(pages).length;
}
