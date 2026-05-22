import { useQuery } from '@tanstack/react-query';
import {
  APPOINTMENT_PENDING_POLL_INTERVAL_MS,
} from '@oneandlab/shared-constants';
import {
  isBloodTestAppointment,
  isPendingIncomingOffer,
} from '@oneandlab/shared-utils';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { fetchPendingOffers } from '../api/appointments.service';

export function usePendingOffersPoll(enabled: boolean) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';
  const myId = user?.id;

  return useQuery({
    queryKey: queryKeys.appointments.pendingOffers(role),
    queryFn: async () => {
      const res = await fetchPendingOffers(role);
      if (!res.success || !res.data || !myId) return [];
      return res.data.filter((a) => {
        if (role === 'nurse') {
          return (
            a.status === 'pending' &&
            !isBloodTestAppointment(a.type) &&
            isPendingIncomingOffer(a, myId) &&
            (a.assigned_nurse_id === myId || !a.assigned_nurse_id)
          );
        }
        return false;
      });
    },
    enabled: enabled && Boolean(myId) && role === 'nurse',
    refetchInterval: APPOINTMENT_PENDING_POLL_INTERVAL_MS,
  });
}
