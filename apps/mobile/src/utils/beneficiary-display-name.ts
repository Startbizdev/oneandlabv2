import type { Appointment } from '@oneandlab/shared-types';
import { patientDisplayName } from '@/utils/appointment-detail-display';

type AptExt = Appointment & {
  relative?: {
    first_name?: string;
    last_name?: string;
  };
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
