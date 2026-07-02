import type { NurseTourStop } from '~/composables/useNurseTourWeb';
import { formatPassageTourListTimeLabel, resolveTourStopRouteListLabels } from '@oneandlab/shared-utils';
import { formatAvailabilityDisplayFr } from '~/utils/appointment-datetime-fr';

export function formatPassageTourStopTimeLabel(stop: NurseTourStop): string {
  const label = formatPassageTourListTimeLabel({
    passage_time_slot: stop.passage_time_slot,
    scheduled_at: stop.scheduled_at,
    availability: stop.availability,
    passage_custom_time: stop.passage_custom_time,
    passage_series_id: stop.passage_series_id,
  });
  if (label && label !== 'Horaire à confirmer') return label;

  const fallback = formatAvailabilityDisplayFr(stop.availability, stop.scheduled_at, {
    passage_time_slot: stop.passage_time_slot,
    passage_source: stop.passage_series_id ? 'nurse_passage' : undefined,
    custom_time: stop.passage_custom_time,
    availability: stop.availability,
    passage_duration_minutes: stop.passage_duration_minutes,
  });
  return fallback || label;
}

export function formatPassageTourStopRouteLabel(stop: NurseTourStop, stopIndex: number): string | null {
  const { kmLabel, driveMinLabel } = resolveTourStopRouteListLabels(stop, stopIndex);
  return [kmLabel, driveMinLabel].filter(Boolean).join(' · ') || null;
}

export function resolvePassageTourStopRouteLabels(stop: NurseTourStop, stopIndex: number) {
  return resolveTourStopRouteListLabels(stop, stopIndex);
}
