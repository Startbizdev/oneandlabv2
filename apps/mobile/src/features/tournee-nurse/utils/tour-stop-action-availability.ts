import { appointmentDossierPatientId, isTourStopAbsent, isTourStopDone } from '@oneandlab/shared-utils';
import type { NurseTourStop } from '../api/nurse-tour.service';

export type TourStopActionAvailability = {
  reschedule: boolean;
  manageAbsence: boolean;
  liftAbsence: boolean;
};

/** Le créneau ne se change que sur un passage à venir ; l'absence exige un patient connu. */
export function tourStopActionAvailability(stop: NurseTourStop): TourStopActionAvailability {
  const absent = isTourStopAbsent(stop);
  const hasPatient = Boolean(appointmentDossierPatientId(stop));
  return {
    reschedule: !absent && !isTourStopDone(stop),
    manageAbsence: hasPatient,
    liftAbsence: hasPatient && absent && Boolean(stop.patient_absence?.id),
  };
}

export function hasTourStopActions(stop: NurseTourStop): boolean {
  const available = tourStopActionAvailability(stop);
  return available.reschedule || available.manageAbsence || available.liftAbsence;
}
