import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

/**
 * Rafraîchit les requêtes RDV actives au focus sans vider le cache
 * (évite skeleton bloqué + spinner RefreshControl sur chaque poll).
 */
export function useAppointmentsCacheSyncOnFocus(enabled = true) {
  const qc = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      void qc.refetchQueries({
        queryKey: queryKeys.appointments.all,
        type: 'active',
        stale: true,
      });
      return undefined;
    }, [enabled, qc]),
  );
}
