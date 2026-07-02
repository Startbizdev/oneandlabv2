import type { NurseTourStop } from '@/features/tournee-nurse/api/nurse-tour.service';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import {
  formatPassageDurationLabel as formatPassageDurationMinutes,
  formatPassageTourListTimeLabel,
  resolveTourStopRouteListLabels,
  PASSAGE_TIME_SLOT_LABELS,
  resolveTourStopRouteMetrics,
} from '@oneandlab/shared-utils';

export function formatPassageTimeLabel(stop: NurseTourStop): string {
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

export function formatPassageDurationLabel(stop: NurseTourStop): string | null {
  return formatPassageDurationMinutes(stop.passage_duration_minutes);
}

export function formatPassageRouteLineLabel(stop: NurseTourStop, stopIndex: number): string | null {
  const { kmLabel, driveMinLabel } = resolveTourStopRouteListLabels(stop, stopIndex);
  return [kmLabel, driveMinLabel].filter(Boolean).join(' · ') || null;
}

export function resolvePassageRouteListLabels(stop: NurseTourStop, stopIndex: number) {
  return resolveTourStopRouteListLabels(stop, stopIndex);
}

/** @deprecated Préférer formatPassageRouteLineLabel */
export function formatTourStopRouteLabel(stop: NurseTourStop): string | null {
  const metrics = resolveTourStopRouteMetrics(stop);
  if (!metrics) return null;
  const minPart = metrics.min > 0 ? ` · ~${metrics.min} min` : '';
  return `${metrics.km.toFixed(1)} km${minPart}`;
}

export function formatPassageCareLabels(stop: NurseTourStop): string {
  const display = stop.nursing_items_display ?? stop.nursing_items ?? [];
  const names = display
    .map((row) => {
      if (!row || typeof row !== 'object') return '';
      const r = row as Record<string, unknown>;
      return String(r.label ?? r.category_name ?? r.name ?? '').trim();
    })
    .filter(Boolean);
  if (names.length > 0) return names.join(' · ');
  return stop.category_name?.trim() || 'Soin infirmier';
}

export { PASSAGE_TIME_SLOT_LABELS };
