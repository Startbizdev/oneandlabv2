import { appointmentsPendingOffersQuery } from '@oneandlab/shared-api';
import type { Appointment, AppointmentListFilters } from '@oneandlab/shared-types';
import { api } from '@/api/client';

export function buildAppointmentsQuery(filters: AppointmentListFilters): string {
  const qs = new URLSearchParams();
  if (filters.status) qs.set('status', String(filters.status));
  if (filters.type) qs.set('type', filters.type);
  if (filters.page) qs.set('page', String(filters.page));
  if (filters.limit) qs.set('limit', String(filters.limit));
  if (filters.patient_id) qs.set('patient_id', filters.patient_id);
  if (filters.nurse_tab) qs.set('nurse_tab', filters.nurse_tab);
  if (filters.nurse_segment) qs.set('nurse_segment', filters.nurse_segment);
  if (filters.date_from) qs.set('date_from', filters.date_from);
  if (filters.date_to) qs.set('date_to', filters.date_to);
  if (filters.assigned_only) qs.set('assigned_only', '1');
  if (filters.patient_period) qs.set('patient_period', filters.patient_period);
  return `/appointments?${qs.toString()}`;
}

export async function fetchAppointments(filters: AppointmentListFilters) {
  return api.get<Appointment[]>(buildAppointmentsQuery(filters));
}

export type AppointmentsPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
  has_more: boolean;
};

export async function fetchAppointmentsPaginated(
  filters: AppointmentListFilters,
): Promise<{ appointments: Appointment[]; pagination: AppointmentsPagination }> {
  const res = await api.get<Appointment[]>(buildAppointmentsQuery(filters));
  if (!res.success) {
    throw new Error(res.error ?? 'Erreur chargement RDV');
  }
  const p = res.pagination as
    | {
        page?: number;
        limit?: number;
        total?: number;
        pages?: number;
        total_pages?: number;
        has_more?: boolean;
      }
    | undefined;
  const page = p?.page ?? filters.page ?? 1;
  const limit = p?.limit ?? filters.limit ?? 20;
  const total = p?.total ?? res.data?.length ?? 0;
  const pages = p?.pages ?? p?.total_pages ?? (limit > 0 ? Math.ceil(total / limit) : 1);
  const has_more = p?.has_more ?? page < pages;
  return {
    appointments: res.data ?? [],
    pagination: { page, limit, total, pages, has_more },
  };
}

export async function fetchPendingOffers(role: string) {
  return api.get<Appointment[]>(appointmentsPendingOffersQuery(role));
}

export async function fetchAppointment(id: string) {
  return api.get<Appointment>(`/appointments/${id}`);
}

export async function updateAppointment(id: string, body: Record<string, unknown>) {
  return api.put<Appointment>(`/appointments/${id}`, body);
}

export async function createAppointment(body: Record<string, unknown>) {
  return api.post<Appointment>('/appointments', body);
}

export async function fetchCategories(type?: string) {
  const q = type ? `?type=${type}` : '';
  return api.get<unknown[]>(`/categories${q}`);
}
