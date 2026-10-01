import { useCallback, useState } from 'react';
import { useToast } from '@/providers/ToastProvider';
import { deletePatientAbsence } from '@/features/patient-absence/api/patient-absence.service';
import type { NurseTourStop } from '../api/nurse-tour.service';
import { hasTourStopActions } from '../utils/tour-stop-action-availability';

/** État des feuilles d'un passage de tournée : actions, créneau, absence, retour du patient. */
export function useTourStopActions(refetch: () => unknown) {
  const { show: showToast } = useToast();
  const [actionsStop, setActionsStop] = useState<NurseTourStop | null>(null);
  const [rescheduleStop, setRescheduleStop] = useState<NurseTourStop | null>(null);
  const [absenceStop, setAbsenceStop] = useState<NurseTourStop | null>(null);
  const [liftingAbsence, setLiftingAbsence] = useState(false);

  const openStopActions = useCallback(
    (stop: NurseTourStop) => {
      if (!hasTourStopActions(stop)) {
        showToast('Aucune action disponible pour ce passage', { type: 'error' });
        return;
      }
      setActionsStop(stop);
    },
    [showToast],
  );

  const liftAbsence = useCallback(
    async (stop: NurseTourStop) => {
      const patientId = stop.patient_id;
      const absenceId = stop.patient_absence?.id;
      if (!patientId || !absenceId) return;
      setLiftingAbsence(true);
      try {
        await deletePatientAbsence(patientId, absenceId);
        setActionsStop(null);
        showToast('Absence levée, patient de retour', { type: 'success' });
        void refetch();
      } catch (e) {
        console.warn('[tour] levée d’absence impossible', e);
        showToast('Suppression impossible', { type: 'error' });
      } finally {
        setLiftingAbsence(false);
      }
    },
    [refetch, showToast],
  );

  return {
    openStopActions,
    actionsSheet: {
      stop: actionsStop,
      liftingAbsence,
      onClose: useCallback(() => setActionsStop(null), []),
      onReschedule: setRescheduleStop,
      onManageAbsence: setAbsenceStop,
      onLiftAbsence: (stop: NurseTourStop) => void liftAbsence(stop),
    },
    rescheduleStop,
    closeReschedule: useCallback(() => setRescheduleStop(null), []),
    absenceStop,
    closeAbsence: useCallback(() => setAbsenceStop(null), []),
  };
}
