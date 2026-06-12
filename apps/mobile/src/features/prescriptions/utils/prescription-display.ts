import type { ProPrescriptionRow } from '../api/prescriptions.service';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';

export function prescriptionPatientLabel(row: ProPrescriptionRow): string {
  const n = [String(row.patient_first_name ?? '').trim(), String(row.patient_last_name ?? '').trim()]
    .filter(Boolean)
    .join(' ');
  return n || '—';
}

export function formatPrescriptionDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

/** Date compacte pour pied de carte (ex. « 12 juin 25 »). */
export function formatPrescriptionDateCompact(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function prescriptionCreneauLabel(row: ProPrescriptionRow): string {
  const label = formatAvailabilityDisplayFr(
    row.appointment_availability,
    row.appointment_scheduled_at,
  ).trim();
  return label || 'Non précisé';
}

/** Type / soin du RDV — aligné liste RDV. */
export function prescriptionCareLabel(row: ProPrescriptionRow): string {
  const cat = String(row.appointment_category_name ?? '').trim();
  if (cat) return cat;
  const t = row.appointment_type;
  if (isBloodTestAppointment(t)) return 'Prélèvement';
  if (isNursingAppointment(t)) return 'Soins infirmiers';
  return 'Rendez-vous';
}

export function prescriptionKindShortLabel(kind: string | null | undefined): string | null {
  if (kind === 'nursing') return 'Actes infirmiers';
  if (kind === 'medical') return 'Médicale';
  return null;
}

export function appointmentOptionLabel(a: {
  scheduled_at?: string | null;
  status?: string | null;
}): string {
  const when = a.scheduled_at ? formatPrescriptionDateTime(a.scheduled_at) : '—';
  const st = a.status ? appointmentStatusLabelFr(a.status) : '';
  return st && st !== '—' ? `${when} · ${st}` : when;
}

export function appointmentStatusLabelFr(status: string | null | undefined): string {
  const s = String(status ?? '').trim();
  const map: Record<string, string> = {
    pending: 'En attente',
    confirmed: 'Confirmé',
    planned: 'Planifié',
    inProgress: 'En cours',
    in_progress: 'En cours',
    completed: 'Terminé',
    canceled: 'Annulé',
    cancelled: 'Annulé',
    expired: 'Expiré',
    refused: 'Refusé',
  };
  return map[s] || s || '—';
}
