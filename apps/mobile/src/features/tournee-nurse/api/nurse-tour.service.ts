import { apiRequest } from '@/api/client';
import type { PatientAbsence } from '@oneandlab/shared-types';

export type TourVisitStatus = 'todo' | 'en_route' | 'on_site' | 'done' | 'skipped';
export type TourSortMode = 'smart' | 'schedule' | 'nearest' | 'manual';
export type NavAppPref = 'waze' | 'google_maps' | 'apple_maps' | 'system';

export interface NurseTourStop {
  stop_id: string;
  appointment_id: string;
  position: number;
  visit_status: TourVisitStatus;
  visited_at?: string | null;
  skip_reason?: string | null;
  patient_name: string;
  patient_id?: string | null;
  is_patient_absent_today?: boolean;
  patient_absence?: PatientAbsence | null;
  patient_gender?: string | null;
  profile_image_url?: string | null;
  type?: string;
  category_id?: string | null;
  category_name: string;
  category_icon?: string | null;
  category_image_url?: string | null;
  creation_batch_id?: string | null;
  batch_sibling_count?: number;
  care_options?: Record<string, string | number> | null;
  nursing_items?: Array<Record<string, unknown>>;
  nursing_items_display?: Array<Record<string, unknown>>;
  status: string;
  scheduled_at?: string | null;
  availability?: unknown;
  passage_time_slot?: string | null;
  passage_custom_time?: string | null;
  passage_duration_minutes?: number | null;
  passage_series_id?: string | null;
  address_line: string;
  address_complement?: string;
  lat?: number | null;
  lng?: number | null;
  distance_km_from_prev: number;
  drive_min_from_prev: number;
  phone?: string;
}

export interface NurseTourPayload {
  date: string;
  plan: {
    id: string;
    sort_mode: TourSortMode;
    manual_order_locked: boolean;
    nav_app_pref: NavAppPref;
    optimized_at?: string | null;
  };
  summary: {
    total_stops: number;
    done_stops: number;
    absent_stops?: number;
    estimated_km: number;
  };
  stops: NurseTourStop[];
  next_stop_id?: string | null;
}

export async function fetchNurseTour(
  date: string,
  coords?: { lat: number; lng: number },
): Promise<NurseTourPayload> {
  const qs = new URLSearchParams({ date });
  if (coords) {
    qs.set('lat', String(coords.lat));
    qs.set('lng', String(coords.lng));
  }
  const res = await apiRequest<NurseTourPayload>(`/nurse/tour?${qs.toString()}`);
  if (!res.data) throw new Error('Tournée indisponible');
  return res.data;
}

export async function fetchNurseTourSummary(from: string, to: string): Promise<Record<string, number>> {
  const qs = new URLSearchParams({ from, to });
  const res = await apiRequest<{ counts: Record<string, number> }>(
    `/nurse/tour/summary?${qs.toString()}`,
  );
  return res.data?.counts ?? {};
}

export async function patchNurseTourOrder(date: string, appointmentIds: string[]): Promise<NurseTourPayload> {
  const res = await apiRequest<NurseTourPayload>('/nurse/tour/order', {
    method: 'PATCH',
    body: { date, appointment_ids: appointmentIds },
  });
  if (!res.data) throw new Error('Ordre non enregistré');
  return res.data;
}

export async function optimizeNurseTour(
  date: string,
  mode: TourSortMode,
  force = false,
  coords?: { lat: number; lng: number },
): Promise<NurseTourPayload> {
  const res = await apiRequest<NurseTourPayload>('/nurse/tour/optimize', {
    method: 'POST',
    body: { date, mode, force, ...(coords ?? {}) },
  });
  if (!res.data) throw new Error('Optimisation impossible');
  return res.data;
}

export async function resetNurseTourOrder(
  date: string,
  coords?: { lat: number; lng: number },
): Promise<NurseTourPayload> {
  const res = await apiRequest<NurseTourPayload>('/nurse/tour/reset-order', {
    method: 'POST',
    body: { date, ...(coords ?? {}) },
  });
  if (!res.data) throw new Error('Réinitialisation impossible');
  return res.data;
}

export async function updateNurseTourStopStatus(
  stopId: string,
  status: TourVisitStatus,
  options?: { skipReason?: string; finalizeAppointment?: boolean },
): Promise<NurseTourPayload> {
  const res = await apiRequest<NurseTourPayload>(`/nurse/tour/stops/${stopId}/status`, {
    method: 'POST',
    body: {
      status,
      skip_reason: options?.skipReason,
      finalize_appointment: options?.finalizeAppointment === true ? true : undefined,
    },
  });
  if (!res.data) throw new Error('Statut non enregistré');
  return res.data;
}

export async function rescheduleNurseTourStop(
  stopId: string,
  payload: { scheduled_at: string; availability: string },
): Promise<NurseTourPayload> {
  const res = await apiRequest<NurseTourPayload>(`/nurse/tour/stops/${stopId}/reschedule`, {
    method: 'PATCH',
    body: payload,
  });
  if (!res.data) throw new Error('Créneau non mis à jour');
  return res.data;
}
