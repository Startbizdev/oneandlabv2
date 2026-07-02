import type { NurseTourStop } from '@/features/tournee-nurse/api/nurse-tour.service';

const SLOT_ORDER: Record<string, number> = {
  morning: 0,
  noon: 1,
  afternoon: 2,
  evening: 3,
  night: 4,
  custom: 5,
};

/** Tri « Mes passages » : ordre créneau puis heure (sans optimisation GPS). */
export function sortStopsForManualView(stops: NurseTourStop[]): NurseTourStop[] {
  return [...stops].sort((a, b) => {
    const sa = SLOT_ORDER[a.passage_time_slot ?? ''] ?? 99;
    const sb = SLOT_ORDER[b.passage_time_slot ?? ''] ?? 99;
    if (sa !== sb) return sa - sb;
    return String(a.scheduled_at ?? '').localeCompare(String(b.scheduled_at ?? ''));
  });
}
