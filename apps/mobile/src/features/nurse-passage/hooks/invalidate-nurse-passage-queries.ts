import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import {
  NURSE_TOUR_QUERY_ROOT,
  NURSE_TOUR_SUMMARY_QUERY_ROOT,
} from '@/features/tournee-nurse/hooks/nurse-tour-query';
import { passageAppointmentQueryKey } from './passage-appointment-query';

export const NURSE_PASSAGE_SERIES_QUERY_ROOT = ['nurse-passage-series'] as const;

export function nursePassageSeriesQueryKey(seriesId: string) {
  return [...NURSE_PASSAGE_SERIES_QUERY_ROOT, seriesId] as const;
}

/** Une série créée, modifiée ou supprimée change la tournée, son résumé, l'agenda et les fiches passage. */
export function invalidateNursePassageQueries(qc: QueryClient, appointmentId?: string): void {
  void qc.invalidateQueries({ queryKey: NURSE_TOUR_QUERY_ROOT });
  void qc.invalidateQueries({ queryKey: NURSE_TOUR_SUMMARY_QUERY_ROOT });
  void qc.invalidateQueries({ queryKey: NURSE_PASSAGE_SERIES_QUERY_ROOT });
  void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
  if (appointmentId) void qc.invalidateQueries({ queryKey: passageAppointmentQueryKey(appointmentId) });
}
