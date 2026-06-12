import { formatAvailabilityDisplayFr } from '~/utils/appointment-datetime-fr';

export interface PrescriptionHistoryRow {
  id: string;
  appointment_id?: string | null;
  file_name?: string | null;
  created_at: string;
  generated_at?: string | null;
  prescription_kind?: string | null;
  appointment_scheduled_at?: string | null;
  appointment_status?: string | null;
  appointment_type?: string | null;
  appointment_category_name?: string | null;
  appointment_availability?: unknown;
  patient_first_name?: string | null;
  patient_last_name?: string | null;
}

export function prescriptionPatientLabel(row: PrescriptionHistoryRow): string {
  const n = [String(row.patient_first_name ?? '').trim(), String(row.patient_last_name ?? '').trim()]
    .filter(Boolean)
    .join(' ');
  return n || '—';
}

export function prescriptionCreneauLabel(row: PrescriptionHistoryRow): string {
  const label = formatAvailabilityDisplayFr(
    row.appointment_availability,
    row.appointment_scheduled_at ?? null,
  ).trim();
  return label || 'Non précisé';
}

export function prescriptionCareLabel(row: PrescriptionHistoryRow): string {
  const cat = String(row.appointment_category_name ?? '').trim();
  if (cat) return cat;
  const t = row.appointment_type ?? '';
  if (t === 'blood_test') return 'Prélèvement';
  if (t === 'nursing') return 'Soins infirmiers';
  return 'Rendez-vous';
}

export function formatPrescriptionRecordedCompact(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatAppointmentDateCompact(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  const s = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
}

export function prescriptionKindShortLabel(kind: string | null | undefined): string | null {
  if (kind === 'nursing') return 'Actes infirmiers';
  if (kind === 'medical') return 'Médicale';
  return null;
}

export function appointmentStatusLabelFr(status: string | null | undefined): string {
  const s = String(status ?? '').trim();
  const map: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    inProgress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return map[s] || s || '—';
}

export function statusBadgeColor(status: string | null | undefined): 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  const s = String(status ?? '');
  if (s === 'completed' || s === 'confirmed') return 'success';
  if (s === 'pending' || s === 'planned') return 'warning';
  if (s === 'inProgress') return 'primary';
  if (s === 'canceled' || s === 'expired' || s === 'refused') return 'error';
  return 'neutral';
}
