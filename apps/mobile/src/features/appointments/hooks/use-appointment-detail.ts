import { useQuery } from '@tanstack/react-query';
import { CACHE_STALE_APPOINTMENT_DETAIL_MS } from '@oneandlab/shared-constants';
import { queryKeys } from '@/lib/query-keys';
import { fetchAppointment } from '../api/appointments.service';

export function useAppointmentDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await fetchAppointment(id, { includeBatch: true });
      if (res.success && (res as { alreadyAccepted?: boolean }).alreadyAccepted) {
        const err = new Error('ALREADY_ACCEPTED');
        throw err;
      }
      if (!res.success) throw new Error(res.error ?? 'RDV introuvable');
      if (!res.data) throw new Error('RDV introuvable');
      return res.data;
    },
    enabled: Boolean(id),
    staleTime: CACHE_STALE_APPOINTMENT_DETAIL_MS,
  });
}
