import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { healthRecordQueryKeys } from './use-health-record-completion';

/** Rafraîchit la complétion du carnet au retour sur l’écran (ex. liste RDV patient). */
export function useHealthRecordCompletionSyncOnFocus(enabled = true) {
  const qc = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      void qc.refetchQueries({
        queryKey: healthRecordQueryKeys.completion,
        type: 'active',
        stale: true,
      });
      return undefined;
    }, [enabled, qc]),
  );
}
