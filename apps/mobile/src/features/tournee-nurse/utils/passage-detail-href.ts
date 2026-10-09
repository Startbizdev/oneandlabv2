import type { Href } from 'expo-router';
import type { NurseTourStop } from '../api/nurse-tour.service';

/** Fiche passage : série de passages si elle existe, sinon RDV seul (`seriesId = rdv`). */
export function nursePassageDetailHref(
  stop: Pick<NurseTourStop, 'passage_series_id' | 'appointment_id' | 'stop_id'>,
): Href {
  return {
    pathname: '/(nurse)/passage/[seriesId]',
    params: {
      seriesId: stop.passage_series_id || 'rdv',
      appointment_id: stop.appointment_id,
      stop_id: stop.stop_id,
    },
  };
}

/** Vue « Documents » du passage : documents du RDV et espace ordonnances. */
export function nursePassageDocumentsHref(seriesId: string, appointmentId: string): Href {
  return {
    pathname: '/(nurse)/passage/[seriesId]/documents',
    params: { seriesId: seriesId || 'rdv', appointment_id: appointmentId },
  };
}
