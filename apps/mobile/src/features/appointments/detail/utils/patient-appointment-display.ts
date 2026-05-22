import type { Appointment } from '@oneandlab/shared-types';
import { ageFromBirthDate, formatBirthDateFr } from '@oneandlab/shared-utils';
import { getRelationshipLabel, patientDisplayName } from '@/utils/appointment-detail-display';
import { resolvePatientContactEmail } from '@/utils/patient-email-display';

type AptExt = Appointment & {
  relative?: {
    first_name?: string;
    last_name?: string;
    relationship_type?: string;
    birth_date?: string;
    gender?: string;
    phone?: string;
    email?: string;
    is_minor?: boolean;
    age_years?: number;
  };
  booking_contact?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    email_display?: string;
  };
  patient_email_display?: string;
};

export function beneficiaryFirstName(apt: Appointment): string {
  const ext = apt as AptExt;
  if (ext.relative?.first_name) return String(ext.relative.first_name).trim();
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  return String(fd.beneficiary_first_name ?? fd.first_name ?? '').trim();
}

export function beneficiaryLastName(apt: Appointment): string {
  const ext = apt as AptExt;
  if (ext.relative?.last_name) return String(ext.relative.last_name).trim();
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  return String(fd.beneficiary_last_name ?? fd.last_name ?? '').trim();
}

export function beneficiaryDisplayName(apt: Appointment): string {
  const name = [beneficiaryFirstName(apt), beneficiaryLastName(apt)].filter(Boolean).join(' ').trim();
  if (name) return name;
  return patientDisplayName(apt) || '—';
}

/** Titre navigation : nom du patient (pas le soin). */
export function appointmentPatientHeaderTitle(
  apt: Appointment | undefined,
  batchCount = 1,
): string {
  if (!apt) return 'Rendez-vous';
  const name = beneficiaryDisplayName(apt);
  if (batchCount > 1) return `${name} · Lot (${batchCount})`;
  return name;
}

export function beneficiaryBirthLine(apt: Appointment): string {
  const ext = apt as AptExt;
  const d = ext.relative?.birth_date ?? (apt.form_data as { birth_date?: string })?.birth_date;
  if (!d) return '';
  const formatted = formatBirthDateFr(String(d));
  if (!formatted) return '';
  const gender = ext.relative?.gender ?? (apt.form_data as { gender?: string })?.gender;
  const prefix =
    gender === 'female' ? 'Née le ' : gender === 'male' ? 'Né le ' : gender === 'other' ? 'Né(e) le ' : 'Né le ';
  let age = ext.relative?.age_years;
  if (age == null || age < 0) age = ageFromBirthDate(String(d)) ?? null;
  const agePart =
    age != null && age >= 0 ? ` · ${age} an${age === 1 ? '' : 's'}` : '';
  return `${prefix}${formatted}${agePart}`;
}

export function bookingContactFullName(apt: Appointment): string {
  const ext = apt as AptExt;
  const bc = ext.booking_contact;
  if (bc) {
    return [bc.first_name, bc.last_name].filter(Boolean).join(' ').trim();
  }
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  return `${fd.booking_contact_first_name ?? fd.account_holder_first_name ?? fd.first_name ?? ''} ${fd.booking_contact_last_name ?? fd.account_holder_last_name ?? fd.last_name ?? ''}`.trim();
}

export function showBookingContactBlock(apt: Appointment): boolean {
  const ext = apt as AptExt;
  if (!ext.relative) return false;
  const name = bookingContactFullName(apt);
  const bc = ext.booking_contact;
  return !!(name || bc?.phone || bc?.email);
}

export function patientContactEmail(
  apt: Appointment,
  viewer?: { email?: string | null; email_display?: string | null },
) {
  const ext = apt as AptExt;
  const raw = ext.relative?.email ?? (apt.form_data as { email?: string })?.email ?? '';
  return resolvePatientContactEmail({
    rawEmail: raw,
    emailDisplay: ext.patient_email_display,
    viewerEmail: viewer?.email,
    viewerEmailDisplay: viewer?.email_display,
  });
}

export function bookingContactEmail(
  apt: Appointment,
  viewer?: { email?: string | null; email_display?: string | null },
) {
  const ext = apt as AptExt;
  const bc = ext.booking_contact;
  if (!bc?.email) return { text: '', href: null };
  return resolvePatientContactEmail({
    rawEmail: bc.email,
    emailDisplay: bc.email_display,
    viewerEmail: viewer?.email,
    viewerEmailDisplay: viewer?.email_display,
  });
}

export function patientPhone(apt: Appointment): string {
  const ext = apt as AptExt;
  return String(ext.relative?.phone ?? (apt.form_data as { phone?: string })?.phone ?? '').trim();
}

export function bookingContactPhone(apt: Appointment): string {
  const ext = apt as AptExt;
  return String(ext.booking_contact?.phone ?? '').trim();
}

export function relationshipLine(apt: Appointment): string {
  const ext = apt as AptExt;
  if (!ext.relative?.relationship_type) return '';
  return getRelationshipLabel(ext.relative.relationship_type);
}
