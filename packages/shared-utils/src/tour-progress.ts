export type TourStopProgressLike = {
  stop_id?: string | null;
  visit_status?: string | null;
  status?: string | null;
};

export function isTourStopDone(stop: TourStopProgressLike): boolean {
  const visit = String(stop.visit_status ?? '').trim();
  if (visit === 'done' || visit === 'skipped') return true;
  return String(stop.status ?? '').trim() === 'completed';
}

export function computeTourSummaryFromStops(
  stops: TourStopProgressLike[],
  estimatedKm = 0,
): { total_stops: number; done_stops: number; estimated_km: number } {
  const total = stops.length;
  const done = stops.filter(isTourStopDone).length;
  return {
    total_stops: total,
    done_stops: done,
    estimated_km: estimatedKm,
  };
}

export function resolveTourNextStopId(stops: TourStopProgressLike[]): string | null {
  for (const stop of stops) {
    const visit = String(stop.visit_status ?? '').trim();
    if (visit !== 'done' && visit !== 'skipped') {
      const id = String(stop.stop_id ?? '').trim();
      if (id) return id;
    }
  }
  return null;
}
