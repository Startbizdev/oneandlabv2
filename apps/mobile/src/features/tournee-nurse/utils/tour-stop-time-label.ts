import { formatPassageStopTimeLabel } from '@oneandlab/shared-utils';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import type { NurseTourStop } from '../api/nurse-tour.service';

/** Horaire d'un passage infirmier (créneau de passage, sinon disponibilité du RDV). */
export function nurseTourStopTimeLabel(stop: NurseTourStop): string {
  return (
    formatPassageStopTimeLabel({
      passage_time_slot: stop.passage_time_slot,
      scheduled_at: stop.scheduled_at,
      availability: stop.availability,
      passage_custom_time: stop.passage_custom_time,
    }) ??
    formatAvailabilityDisplayFr(stop.availability, stop.scheduled_at, {
      passage_time_slot: stop.passage_time_slot,
      passage_source: 'nurse_passage',
      custom_time: stop.passage_custom_time,
      availability: stop.availability,
    })
  );
}
