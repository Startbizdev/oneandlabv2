import type { ProPrescriptionRow } from '../api/prescriptions.service';

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
