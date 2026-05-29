import { useQuery } from '@tanstack/react-query';
import { CACHE_STALE_APPOINTMENT_DETAIL_MS } from '@oneandlab/shared-constants';
import { queryKeys } from '@/lib/query-keys';
import { fetchAppointment } from '../api/appointments.service';
import {
  APPOINTMENT_ACCESS_DENIED,
  APPOINTMENT_ALREADY_ACCEPTED,
  isAppointmentAccessDeniedMessage,
  type AppointmentDetailData,
} from './appointment-detail-result';

export function useAppointmentDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id ?? ''),
    queryFn: async (): Promise<AppointmentDetailData | null> => {
      if (!id) return null;
      const res = await fetchAppointment(id, { includeBatch: true });
      if (res.success && (res as { alreadyAccepted?: boolean }).alreadyAccepted) {
        return APPOINTMENT_ALREADY_ACCEPTED;
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
