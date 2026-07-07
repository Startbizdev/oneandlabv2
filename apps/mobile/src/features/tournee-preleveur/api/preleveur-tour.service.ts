import { apiRequest } from '@/api/client';

export type TourSortMode = 'smart' | 'schedule' | 'nearest' | 'manual';

export interface PreleveurTourStop {
  stop_id: string;
  appointment_id: string;
  position: number;
  visit_status: string;
  patient_name: string;
  status: string;
  scheduled_at?: string | null;
  availability?: unknown;
  address_line: string;
  lat?: number | null;
  lng?: number | null;
  distance_km_from_prev: number;
  drive_min_from_prev: number;
  phone?: string;
  category_name?: string;
}

export interface PreleveurTourPayload {
  date: string;
  plan: {
    id: string;
    sort_mode: TourSortMode;
    manual_order_locked: boolean;
    nav_app_pref: string;
    optimized_at?: string | null;
  };
  summary: {
    total_stops: number;
    done_stops: number;
    estimated_km: number;
  };
  stops: PreleveurTourStop[];
  next_stop_id?: string | null;
}

export async function fetchPreleveurTour(
  date: string,
  coords?: { lat: number; lng: number },
): Promise<PreleveurTourPayload> {
  const qs = new URLSearchParams({ date });
  if (coords) {
    qs.set('lat', String(coords.lat));
    qs.set('lng', String(coords.lng));
  }
  const res = await apiRequest<PreleveurTourPayload>(`/preleveur/tour?${qs.toString()}`);
  if (!res.data) throw new Error('Tournée indisponible');
  return res.data;
}

export async function fetchPreleveurTourSummary(from: string, to: string): Promise<Record<string, number>> {
  const qs = new URLSearchParams({ from, to });
  const res = await apiRequest<{ counts: Record<string, number> }>(
    `/preleveur/tour/summary?${qs.toString()}`,
  );
  return res.data?.counts ?? {};
}

export async function patchPreleveurTourOrder(
  date: string,
  appointmentIds: string[],
): Promise<PreleveurTourPayload> {
  const res = await apiRequest<PreleveurTourPayload>('/preleveur/tour/order', {
    method: 'PATCH',
    body: { date, appointment_ids: appointmentIds },
  });
  if (!res.data) throw new Error('Ordre non enregistré');
  return res.data;
}

export async function optimizePreleveurTour(
  date: string,
  mode: TourSortMode,
  force = false,
  coords?: { lat: number; lng: number },
): Promise<PreleveurTourPayload> {
  const res = await apiRequest<PreleveurTourPayload>('/preleveur/tour/optimize', {
    method: 'POST',
    body: { date, mode, force, ...(coords ?? {}) },
  });
  if (!res.data) throw new Error('Optimisation impossible');
  return res.data;
}
