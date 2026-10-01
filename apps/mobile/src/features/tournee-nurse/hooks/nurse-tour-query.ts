import dayjs from 'dayjs';
import {
  computeTourSummaryFromStops,
  isTourStopAbsent,
  isTourStopDone,
  resolveTourNextStopId,
} from '@oneandlab/shared-utils';
import { fetchNurseTour, type NurseTourPayload, type NurseTourStop } from '../api/nurse-tour.service';
import type { TourOrigin } from './use-tour-origin';

export const NURSE_TOUR_STALE_MS = 60_000;

/** La position ne sert qu'au calcul de l'ordre : elle n'entre pas dans la clé, sinon chaque variation GPS vide le cache. */
export const NURSE_TOUR_QUERY_ROOT = ['nurse-tour'] as const;

export function nurseTourQueryKey(date: string) {
  return [...NURSE_TOUR_QUERY_ROOT, date] as const;
}

export function todayTourDate(): string {
  return dayjs().format('YYYY-MM-DD');
}

export function withDerivedSummary(tour: NurseTourPayload): NurseTourPayload {
  const summary = computeTourSummaryFromStops(tour.stops, tour.summary.estimated_km);
  return {
    ...tour,
    summary,
    next_stop_id: resolveTourNextStopId(tour.stops),
  };
}

export function nurseTourQueryOptions(date: string, getOrigin: () => TourOrigin | null) {
  return {
    queryKey: nurseTourQueryKey(date),
    queryFn: () => fetchNurseTour(date, getOrigin() ?? undefined),
    staleTime: NURSE_TOUR_STALE_MS,
  };
}

/** Prochain passage à effectuer : ni absent, ni déjà effectué (y compris RDV clôturé). */
export function findNextTourStop(tour: NurseTourPayload | undefined): NurseTourStop | null {
  if (!tour) return null;
  return tour.stops.find((stop) => !isTourStopAbsent(stop) && !isTourStopDone(stop)) ?? null;
}
