import type { Appointment } from '@oneandlab/shared-types';

export function reschedulePatientDisplayName(apt: Appointment): string {
  const ext = apt as Appointment & {
    relative?: { first_name?: string; last_name?: string };
    form_data?: Record<string, unknown>;
  };
  const rel = ext.relative;
  const fd = (ext.form_data ?? {}) as Record<string, unknown>;
  const first = String(rel?.first_name ?? fd.first_name ?? '').trim();
  const last = String(rel?.last_name ?? fd.last_name ?? '').trim();
  return [last, first].filter(Boolean).join(' ') || 'Patient';
}

export function reschedulePatientTitleName(apt: Appointment): string {
  const ext = apt as Appointment & {
    relative?: { first_name?: string; last_name?: string };
    form_data?: Record<string, unknown>;
  };
  const rel = ext.relative;
  const fd = (ext.form_data ?? {}) as Record<string, unknown>;
  const first = String(rel?.first_name ?? fd.first_name ?? '').trim();
  const last = String(rel?.last_name ?? fd.last_name ?? '').trim();
  return [first, last].filter(Boolean).join(' ') || 'ce patient';
}

export function reschedulePatientPhone(apt: Appointment): string {
  const ext = apt as Appointment & {
    relative?: { phone?: string };
    form_data?: { phone?: string };
  };
  return (ext.relative?.phone ?? ext.form_data?.phone ?? '')?.trim() || '';
}
