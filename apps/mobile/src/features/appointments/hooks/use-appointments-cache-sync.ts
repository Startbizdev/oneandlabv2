import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

/** Rafraîchit listes + détails RDV au retour sur l’écran (évite liste stale après détail / édition). */
export function useAppointmentsCacheSyncOnFocus(enabled = true) {
  const qc = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      void qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
      return undefined;
    }, [enabled, qc]),
  );
}
