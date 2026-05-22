import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import { isTechnicalPatientEmail, patientUiEmailLine } from '@/utils/patient-email-display';

function capitalizeNamePart(value: string): string {
  const t = value.trim();
  if (!t) return '';
  if (t.length <= 2 && t === t.toUpperCase()) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Prénom + nom lisibles (ex. « kelly illouz » → « Kelly Illouz »). */
export function patientDisplayName(p: {
  first_name?: string | null;
  last_name?: string | null;
}): string {
  const first = (p.first_name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalizeNamePart)
    .join(' ');
  const last = (p.last_name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(capitalizeNamePart)
    .join(' ');
  return `${first} ${last}`.trim() || 'Patient';
}

export function patientRecordEmailLine(p: {
  email?: string | null;
  email_display?: string | null;
}): string {
  return patientUiEmailLine({
    email: p.email,
    email_display: p.email_display ?? null,
  });
}

/** 2e ligne liste patients — court uniquement (pas de paragraphe API). */
export function patientListSubtitle(p: {
  email?: string | null;
  email_display?: string | null;
  phone?: string | null;
}): string {
  const parts: string[] = [];
  const phone = p.phone?.trim();
  if (phone) parts.push(phone);

  const raw = typeof p.email === 'string' ? p.email.trim() : '';
  if (raw && !isTechnicalPatientEmail(raw)) {
    parts.push(raw.length > 40 ? `${raw.slice(0, 37)}…` : raw);
  } else if (isTechnicalPatientEmail(raw)) {
    const d = typeof p.email_display === 'string' ? p.email_display.trim() : '';
    if (d && d.length <= 48 && !d.toLowerCase().includes('sans adresse')) {
      parts.push(d);
    }
  }

  return parts.join(' · ');
}

/** Option sélecteur patient (nom seul à l’écran ; searchText pour le filtre). */
export function patientPickerOptionFromRow(p: PatientRow): {
  id: string;
  label: string;
  searchText: string;
} {
  const phone = p.phone?.trim() ?? '';
  const rawEmail = typeof p.email === 'string' ? p.email.trim() : '';
  const email =
    rawEmail && !isTechnicalPatientEmail(rawEmail) ? rawEmail : '';
  const searchText = [patientDisplayName(p), phone, email, p.first_name, p.last_name]
    .filter(Boolean)
    .join(' ');

  return {
    id: p.id,
    label: patientDisplayName(p),
    searchText,
  };
}

/** @deprecated Utiliser patientPickerOptionFromRow pour les pickers. */
export function patientOptionFromRow(p: PatientRow): {
  id: string;
  label: string;
  metaLine?: string;
} {
  return {
    id: p.id,
    label: patientDisplayName(p),
    metaLine: patientListSubtitle(p) || undefined,
  };
}
