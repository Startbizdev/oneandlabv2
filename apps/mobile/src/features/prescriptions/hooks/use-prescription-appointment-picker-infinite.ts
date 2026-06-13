import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { CACHE_STALE_APPOINTMENTS_LIST_MS } from '@oneandlab/shared-constants';
import { fetchAppointmentsPaginated } from '@/features/appointments/api/appointments.service';
import type { PrescriptionKind } from '../api/prescriptions.service';
import { PRESCRIPTION_APPOINTMENT_PAGE_SIZE } from '../constants';

type Page = Awaited<ReturnType<typeof fetchAppointmentsPaginated>>;

export function usePrescriptionAppointmentPickerInfinite(
  patientId: string,
  prescriptionKind: PrescriptionKind,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: [
      'prescriptions',
      'appointments',
      'infinite',
      patientId,
      prescriptionKind,
    ] as const,
    queryFn: async ({ pageParam = 1 }) =>
      fetchAppointmentsPaginated({
        patient_id: patientId,
        limit: PRESCRIPTION_APPOINTMENT_PAGE_SIZE,
        page: pageParam,
        ...(prescriptionKind === 'nursing' ? { type: 'nursing' } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.has_more ? lastPage.pagination.page + 1 : undefined,
    enabled: enabled && Boolean(patientId),
    staleTime: CACHE_STALE_APPOINTMENTS_LIST_MS,
    placeholderData: keepPreviousData,
  });
}

/** Déduplique les RDV chargés page par page (lots / re-fetch). */
export function flattenPrescriptionPickerAppointments(
  pages: Page[] | undefined,
): Appointment[] {
  if (!pages?.length) return [];
  const seen = new Set<string>();
  const out: Appointment[] = [];
  for (const page of pages) {
    for (const apt of page.appointments) {
      if (seen.has(apt.id)) continue;
      seen.add(apt.id);
      out.push(apt);
    }
  }
  return out;
}

export function prescriptionPickerTotalCount(pages: Page[] | undefined): number {
  const first = pages?.[0];
  return first?.pagination.total ?? flattenPrescriptionPickerAppointments(pages).length;
}
