import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CACHE_STALE_APPOINTMENT_DETAIL_MS } from '@oneandlab/shared-constants';
import { queryKeys } from '@/lib/query-keys';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import { fetchAppointment } from '../api/appointments.service';
import {
  APPOINTMENT_ACCESS_DENIED,
  APPOINTMENT_ALREADY_ACCEPTED,
  APPOINTMENT_UNAVAILABLE,
  isAppointmentAccessDeniedMessage,
  type AppointmentDetailData,
} from './appointment-detail-result';

/**
 * RDV supprimé (404) ou plus accessible (403, ex. réassigné) : état définitif, sans relance.
 * Le client lève sur ces statuts ; sans cette lecture, la requête était relancée en boucle (squelette sans fin).
 */
function detailOutcomeFromError(error: unknown): AppointmentDetailData | null {
  if (!(error instanceof ApiRequestError)) return null;
  if (error.status === 404) return APPOINTMENT_UNAVAILABLE;
  if (error.status === 403 || isAppointmentAccessDeniedMessage(error.message)) return APPOINTMENT_ACCESS_DENIED;
  return null;
}

/** Listes et calendriers de RDV (pas le détail, qui relancerait cette requête). */
const LIST_KINDS = new Set(['list', 'infinite', 'calendar', 'pending-offers']);

export function useAppointmentDetail(id: string | undefined) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: queryKeys.appointments.detail(id ?? ''),
    queryFn: async (): Promise<AppointmentDetailData | null> => {
      if (!id) return null;
      let res: Awaited<ReturnType<typeof fetchAppointment>>;
      try {
        res = await fetchAppointment(id, { includeBatch: true });
      } catch (error) {
        const outcome = detailOutcomeFromError(error);
        if (outcome) {
          // La carte de ce RDV ne doit plus apparaître au retour sur la liste.
          void qc.invalidateQueries({
            queryKey: queryKeys.appointments.all,
            predicate: (query) => LIST_KINDS.has(String(query.queryKey[1])),
          });
          return outcome;
        }
        throw error;
      }
      if (res.success && (res as { alreadyAccepted?: boolean }).alreadyAccepted) {
        return APPOINTMENT_ALREADY_ACCEPTED;
      }
      if (res.success && (res as { appointmentUnavailable?: boolean }).appointmentUnavailable) {
        return APPOINTMENT_UNAVAILABLE;
      }
      if (!res.success) {
        const err = res.error ?? 'RDV introuvable';
        if (isAppointmentAccessDeniedMessage(err)) {
          return APPOINTMENT_ACCESS_DENIED;
        }
        throw new Error(err);
      }
      if (!res.data) throw new Error('RDV introuvable');
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: CACHE_STALE_APPOINTMENT_DETAIL_MS,
  });
}
