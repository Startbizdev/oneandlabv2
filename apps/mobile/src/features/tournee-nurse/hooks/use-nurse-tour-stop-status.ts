import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import {
  updateNurseTourStopStatus,
  type NurseTourPayload,
  type NurseTourStop,
  type TourVisitStatus,
} from '../api/nurse-tour.service';
import { nurseTourQueryKey } from './nurse-tour-query';

/** Statut de visite avec mise à jour optimiste du cache de la journée (rollback si le serveur refuse). */
export function useNurseTourStopStatus(date: string) {
  const qc = useQueryClient();

  return useCallback(
    async (stopId: string, status: TourVisitStatus) => {
      const key = nurseTourQueryKey(date);
      const current = qc.getQueryData<NurseTourPayload>(key);
      if (!current) return;

      const visitedAt =
        status === 'done' || status === 'on_site' ? new Date().toISOString() : null;
      const optimisticStops = current.stops.map((s) => {
        if (s.stop_id !== stopId) return s;
        const nextStatus =
          status === 'todo' && s.status === 'completed' ? ('confirmed' as const) : s.status;
        return {
          ...s,
          visit_status: status,
          visited_at: visitedAt,
          status: nextStatus,
        };
      });
      qc.setQueryData(key, { ...current, stops: optimisticStops });

      try {
        const updated = await updateNurseTourStopStatus(stopId, status);
        qc.setQueryData(key, updated);
      } catch (error) {
        qc.setQueryData(key, current);
        throw error;
      }
    },
    [date, qc],
  );
}

/**
 * « Effectué » appliqué tout de suite puis annulable : le backend accepte le retour au statut précédent
 * (`POST /nurse/tour/stops/:id/status`, statuts todo / en_route / on_site).
 */
export function useNurseTourStopCompletion(date: string) {
  const setStatus = useNurseTourStopStatus(date);
  const { show: toast, showUndo } = useToast();

  const markDone = useCallback(
    async (stop: NurseTourStop) => {
      const previous: TourVisitStatus =
        stop.visit_status === 'done' || stop.visit_status === 'skipped' ? 'todo' : stop.visit_status;
      try {
        await setStatus(stop.stop_id, 'done');
      } catch (error) {
        handleApiError(error, toast, 'nurse-tour-done', 'Passage non enregistré');
        return;
      }
      showUndo('Passage marqué effectué', () => {
        setStatus(stop.stop_id, previous).catch((error: unknown) =>
          handleApiError(error, toast, 'nurse-tour-undo', 'Annulation impossible'),
        );
      });
    },
    [setStatus, showUndo, toast],
  );

  const reopen = useCallback(
    async (stop: NurseTourStop) => {
      try {
        await setStatus(stop.stop_id, 'todo');
      } catch (error) {
        handleApiError(error, toast, 'nurse-tour-reopen', 'Modification non enregistrée');
      }
    },
    [setStatus, toast],
  );

  return { markDone, reopen };
}
