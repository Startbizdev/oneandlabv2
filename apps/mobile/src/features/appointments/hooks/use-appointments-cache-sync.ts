import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

/** En deçà, la liste vient d'être chargée (montage, pull-to-refresh) : pas de second appel au focus. */
export const APPOINTMENTS_FOCUS_SYNC_MIN_AGE_MS = 5_000;

const LIST_KINDS = new Set(['infinite', 'list', 'calendar']);

/**
 * Retour sur une liste : refetch des listes RDV affichées, même « fraîches » au sens du staleTime (2 min).
 * Sinon un statut changé entre-temps (offre acceptée, fiche rafraîchie par son polling) reste « En attente ».
 */
export function refetchAppointmentListsOnFocus(qc: QueryClient, now = Date.now()): Promise<void> {
  return qc.refetchQueries({
    queryKey: queryKeys.appointments.all,
    type: 'active',
    predicate: (query) => {
      if (query.state.isInvalidated) return true;
      if (!LIST_KINDS.has(String(query.queryKey[1] ?? ''))) return query.isStale();
      return now - query.state.dataUpdatedAt >= APPOINTMENTS_FOCUS_SYNC_MIN_AGE_MS;
    },
  });
}

/**
 * Rafraîchit les listes RDV actives au focus sans vider le cache
 * (évite skeleton bloqué + spinner RefreshControl sur chaque poll).
 */
export function useAppointmentsCacheSyncOnFocus(enabled = true) {
  const qc = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      void refetchAppointmentListsOnFocus(qc);
      return undefined;
    }, [enabled, qc]),
  );
}
