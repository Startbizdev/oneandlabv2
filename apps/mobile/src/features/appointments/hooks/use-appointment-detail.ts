import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { fetchAppointment } from '../api/appointments.service';

export function useAppointmentDetail(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.appointments.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null;
      const res = await fetchAppointment(id);
      if (!res.success) throw new Error(res.error ?? 'RDV introuvable');
      return res.data ?? null;
    },
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
