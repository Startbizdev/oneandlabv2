import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import {
  setNurseTourStopItemDone,
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

/** Soin coché / décoché avec mise à jour optimiste ; le serveur renvoie la tournée (passage coché si tous les soins le sont). */
export function useNurseTourStopItemDone(date: string) {
  const qc = useQueryClient();
  const { show: toast } = useToast();

  return useCallback(
    async (stopId: string, itemId: string, done: boolean) => {
      const key = nurseTourQueryKey(date);
      const current = qc.getQueryData<NurseTourPayload>(key);
      if (!current) return;

      const doneAt = done ? new Date().toISOString() : null;
      qc.setQueryData(key, {
        ...current,
        stops: current.stops.map((s) =>
          s.stop_id !== stopId
            ? s
            : {
                ...s,
                nursing_items: s.nursing_items?.map((item) =>
                  item.id === itemId ? { ...item, done_at: doneAt } : item,
                ),
              },
        ),
      });

      try {
        qc.setQueryData(key, await setNurseTourStopItemDone(stopId, itemId, done));
      } catch (error) {
        qc.setQueryData(key, current);
        handleApiError(error, toast, 'nurse-tour-item-done', 'Soin non enregistré');
      }
    },
    [date, qc, toast],
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
