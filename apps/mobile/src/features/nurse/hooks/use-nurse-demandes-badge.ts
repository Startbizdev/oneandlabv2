import { useMemo } from 'react';
import { isPendingIncomingOffer } from '@oneandlab/shared-utils';
import { groupAppointmentsForNurseMesDemandes } from '@/utils/appointment-batch';
import { useAuthStore } from '@/store/auth-store';
import {
  NURSE_DEMANDES_LIST_FILTERS,
  useNursePendingDemandesQuery,
} from './use-nurse-pending-demandes-query';

export { NURSE_DEMANDES_LIST_FILTERS };

/** Nombre de lignes « Mes demandes » (lots regroupés) pour le badge onglet. */
export function useNurseDemandesBadgeCount(enabled = true) {
  const user = useAuthStore((s) => s.user);
  const myId = user?.id;

  const query = useNursePendingDemandesQuery(enabled);

  const count = useMemo(() => {
    const incoming = (query.data ?? []).filter(
      (a) =>
        a.status === 'pending' &&
        isPendingIncomingOffer(a, myId) &&
        (a.assigned_nurse_id === myId || !a.assigned_nurse_id),
    );
    return groupAppointmentsForNurseMesDemandes(incoming).length;
  }, [query.data, myId]);

  return { count, ...query };
}
