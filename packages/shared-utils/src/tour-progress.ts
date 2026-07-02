export type TourStopProgressLike = {
  stop_id?: string | null;
  visit_status?: string | null;
  status?: string | null;
  is_patient_absent_today?: boolean;
  patient_absence?: { id?: string } | null;
};

export function isTourStopAbsent(stop: TourStopProgressLike): boolean {
  return Boolean(stop.is_patient_absent_today || stop.patient_absence);
}

export function isTourStopDone(stop: TourStopProgressLike): boolean {
  if (isTourStopAbsent(stop)) return false;
  const visit = String(stop.visit_status ?? '').trim();
  if (visit === 'done' || visit === 'skipped') return true;
  return String(stop.status ?? '').trim() === 'completed';
}

export function computeTourSummaryFromStops(
  stops: TourStopProgressLike[],
  estimatedKm = 0,
): { total_stops: number; done_stops: number; absent_stops: number; estimated_km: number } {
  const absent = stops.filter(isTourStopAbsent).length;
  const done = stops.filter(isTourStopDone).length;
  return {
    total_stops: Math.max(0, stops.length - absent),
    done_stops: done,
    absent_stops: absent,
    estimated_km: estimatedKm,
  };
}

export function countTourActiveRemainingStops(stops: TourStopProgressLike[]): number {
  return stops.filter((stop) => !isTourStopDone(stop) && !isTourStopAbsent(stop)).length;
}

export function resolveTourNextStopId(stops: TourStopProgressLike[]): string | null {
  for (const stop of stops) {
    if (isTourStopAbsent(stop)) continue;
    const visit = String(stop.visit_status ?? '').trim();
    if (visit !== 'done' && visit !== 'skipped') {
      const id = String(stop.stop_id ?? '').trim();
      if (id) return id;
    }
  }
  return null;
}
