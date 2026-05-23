import { useMemo } from 'react';
import {
  isBloodTestAppointment,
  isPendingIncomingOffer,
} from '@oneandlab/shared-utils';
import { useNursePendingDemandesQuery } from '@/features/nurse/hooks/use-nurse-pending-demandes-query';
import { useAuthStore } from '@/store/auth-store';

export function usePendingOffersPoll(enabled: boolean) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';
  const myId = user?.id;

  const query = useNursePendingDemandesQuery(enabled && role === 'nurse');

  const data = useMemo(() => {
    const raw = query.data ?? [];
    if (!myId || role !== 'nurse') return [];
    return raw.filter(
      (a) =>
        a.status === 'pending' &&
        !isBloodTestAppointment(a.type) &&
        isPendingIncomingOffer(a, myId) &&
        (a.assigned_nurse_id === myId || !a.assigned_nurse_id),
    );
  }, [myId, query.data, role]);

  return { ...query, data };
}
