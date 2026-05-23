import type { Appointment } from '@oneandlab/shared-types';
import { isNursingAppointment } from '@oneandlab/shared-utils';

/**
 * Statut affiché côté infirmier — aligné backend :
 * création nursing par l'infirmier → confirmé + assigné à lui.
 * Si l'API renvoie encore `pending` avec assignation à soi, on affiche « Confirmé ».
 */
/** Statut à afficher (liste, header, badges) — une seule règle partout. */
export function appointmentStatusForDisplay(
  apt: Appointment | null | undefined,
  opts?: { role?: string; viewerId?: string | null },
): string {
  return effectiveAppointmentStatus(apt, opts);
}

export function effectiveAppointmentStatus(
  apt: Appointment | null | undefined,
  opts?: { role?: string; viewerId?: string | null },
): string {
  const raw = String(apt?.status ?? '');
  if (!apt || !opts?.viewerId || opts.role !== 'nurse') return raw;
  if (!isNursingAppointment(apt.type) || raw !== 'pending') return raw;

  const viewerId = String(opts.viewerId);
  const assigned = String(
    (apt as Appointment & { assigned_nurse_id?: string | null }).assigned_nurse_id ?? '',
  );
  const createdBy = String(apt.created_by ?? '');

  if (assigned === viewerId || createdBy === viewerId) {
    return 'confirmed';
  }
  return raw;
}

export function nurseCanManageAppointment(
  apt: Appointment,
  opts: { role: string; viewerId?: string | null },
): boolean {
  const status = effectiveAppointmentStatus(apt, opts);
  return ['pending', 'confirmed', 'inProgress', 'in_progress'].includes(status);
}

export function nurseCanRescheduleOrCancel(
  apt: Appointment,
  opts: { role: string; viewerId?: string | null },
): boolean {
  const status = effectiveAppointmentStatus(apt, opts);
  return ['pending', 'confirmed', 'inProgress', 'in_progress'].includes(status);
}
