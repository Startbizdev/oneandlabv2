import type { ProPrescriptionRow } from '../api/prescriptions.service';
import type { Appointment } from '@oneandlab/shared-types';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { PARIS_TZ, parseParisWallClock } from '@/utils/paris-datetime';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';

export function prescriptionPatientLabel(row: ProPrescriptionRow): string {
  const n = [String(row.patient_first_name ?? '').trim(), String(row.patient_last_name ?? '').trim()]
    .filter(Boolean)
    .join(' ');
  return n || '—';
}

export function formatPrescriptionDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = parseParisWallClock(iso);
  if (ms == null) return '—';
  return new Date(ms).toLocaleString('fr-FR', {
    timeZone: PARIS_TZ,
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/** Date compacte (ex. « 12 juin 2026 »). */
export function formatPrescriptionDateCompact(iso: string | null | undefined): string {
  if (!iso) return '—';
  const ms = parseParisWallClock(iso);
  if (ms == null) return '—';
  return new Date(ms).toLocaleDateString('fr-FR', {
    timeZone: PARIS_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Alias web — date d'enregistrement compacte. */
export const formatPrescriptionRecordedCompact = formatPrescriptionDateCompact;

/** Titre principal de la ligne historique. */
export function prescriptionHistoryRowTitle(
  row: ProPrescriptionRow,
  options: { showPatient?: boolean } = {},
): string {
  if (options.showPatient === false) {
    return formatPrescriptionDateTime(row.generated_at || row.created_at);
  }
  const patient = prescriptionPatientLabel(row);
  if (patient !== '—') return patient;
  return formatPrescriptionDateTime(row.generated_at || row.created_at);
}

/** Sous-titre liste historique — une ligne compacte (RDV, lot, type). */
export function prescriptionHistoryRowHint(
  row: ProPrescriptionRow,
  options: { showPatient?: boolean } = {},
): string {
  const parts: string[] = [];
  if (options.showPatient !== false) {
    parts.push(formatPrescriptionRecordedCompact(row.generated_at || row.created_at));
  }
  if (row.appointment_id) {
    const schedule = prescriptionAppointmentPickerScheduleLabel({
      scheduled_at: row.appointment_scheduled_at ?? undefined,
      form_data: { availability: row.appointment_availability },
    } as Appointment);
    if (schedule !== 'Date à définir') parts.push(schedule);
  } else {
    parts.push('Sans RDV');
  }
  const kind = prescriptionKindShortLabel(row.prescription_kind);
  if (kind) parts.push(kind);
  const num = String(row.prescription_number ?? '').trim();
  if (num) parts.push(num);
  return parts.join(' · ');
}

export function prescriptionHistoryFooterMeta(
  row: ProPrescriptionRow,
  options: { showPatient?: boolean } = {},
): string {
  const showPatient = options.showPatient !== false;
  const recorded = formatPrescriptionRecordedCompact(row.generated_at || row.created_at);
  const patient = prescriptionPatientLabel(row);

  if (row.appointment_id) {
    let text = `Enregistrée ${recorded}`;
    if (showPatient) text += ` · ${patient}`;
    return text;
  }
  if (showPatient) return patient;
  return formatPrescriptionDateTime(row.generated_at || row.created_at);
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

/** Libellé court pour le trigger combobox RDV. */
export function prescriptionAppointmentSelectSummary(apt: Appointment): string {
  const creneau = formatAvailabilityDisplayFr(
    (apt.form_data as Record<string, unknown> | undefined)?.availability,
    apt.scheduled_at,
  ).trim();
  const when = creneau || (apt.scheduled_at ? formatPrescriptionDateTime(apt.scheduled_at) : '—');
  const care = prescriptionAppointmentCareLabel(apt);
  const st = apt.status ? appointmentStatusLabelFr(apt.status) : '';
  return [when, care, st !== '—' ? st : ''].filter(Boolean).join(' · ');
}

/** Créneau + date pour ligne RDV (sélecteur, historique). */
export function prescriptionAppointmentPickerScheduleLabel(apt: Appointment): string {
  const fd = (apt.form_data as Record<string, unknown> | undefined)?.availability;
  const creneau = formatAvailabilityDisplayFr(fd, apt.scheduled_at).trim();
  if (apt.scheduled_at) {
    const date = formatPrescriptionDateCompact(apt.scheduled_at);
    if (date !== '—') return creneau ? `${date} · ${creneau}` : date;
  }
  return creneau || 'Date à définir';
}

/** @deprecated Utiliser `prescriptionAppointmentPickerScheduleLabel`. */
export const prescriptionAppointmentPickerRowTitle = prescriptionAppointmentPickerScheduleLabel;

/** Libellé lot (historique — à partir du décompte API). */
export function prescriptionLotLabelFromMeta(
  batchCount: number | null | undefined,
  appointmentType: string | null | undefined,
): string {
  const n = Number(batchCount ?? 0);
  if (n <= 1) return '';
  if (isBloodTestAppointment(appointmentType)) {
    return `Lot · ${n} prélèvement${n > 1 ? 's' : ''}`;
  }
  if (isNursingAppointment(appointmentType)) {
    return `Lot · ${n} acte${n > 1 ? 's' : ''} infirmier${n > 1 ? 's' : ''}`;
  }
  return `Lot · ${n} rendez-vous`;
}

export function prescriptionAppointmentCareLabel(apt: Appointment): string {
  const cat = String(apt.category_name ?? '').trim();
  if (cat) return cat;
  if (isBloodTestAppointment(apt.type)) return 'Prélèvement';
  if (isNursingAppointment(apt.type)) return 'Soins infirmiers';
  return 'Rendez-vous';
}

export function prescriptionAppointmentMatchesSearch(apt: Appointment, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const creneau = formatAvailabilityDisplayFr(fd.availability, apt.scheduled_at).toLowerCase();
  const parts = [
    apt.category_name,
    prescriptionAppointmentCareLabel(apt),
    apt.scheduled_at ? formatPrescriptionDateTime(apt.scheduled_at) : '',
    apt.status ? appointmentStatusLabelFr(apt.status) : '',
    creneau,
  ];
  return parts.some((p) => String(p ?? '').toLowerCase().includes(q));
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
