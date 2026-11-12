import type { Appointment } from '@oneandlab/shared-types';
import { isNursingAppointment } from '@oneandlab/shared-utils';

/**
 * Statut à afficher (liste, header, badges) — une seule règle partout, jamais pour décider des actions.
 * Pro à qui le patient a adressé sa demande (QR) : un RDV en attente est « transmis aux soignants »,
 * c'est l'infirmier ou le labo qui accepte et se déplace, pas lui.
 */
export function appointmentStatusForDisplay(
  apt: Appointment | null | undefined,
  opts?: { role?: string; viewerId?: string | null },
): string {
  const status = effectiveAppointmentStatus(apt, opts);
  if (!apt || opts?.role !== 'pro' || !opts.viewerId || status !== 'pending') return status;
  const viewerId = String(opts.viewerId);
  const addressedTo = String((apt as Appointment & { assigned_pro_id?: string | null }).assigned_pro_id ?? '');
  return addressedTo === viewerId && String(apt.created_by ?? '') !== viewerId ? 'referred' : status;
}

/**
 * Statut affiché côté infirmier — aligné backend :
 * création nursing par l'infirmier → confirmé + assigné à lui.
 * Si l'API renvoie encore `pending` avec assignation à soi, on affiche « Confirmé ».
 */
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
  const viewerId = String(opts.viewerId ?? '');
  if (opts.role !== 'nurse' || !viewerId) return false;
  const related =
    String(apt.created_by ?? '') === viewerId
    || String((apt as Appointment & { assigned_nurse_id?: string | null }).assigned_nurse_id ?? '') === viewerId;

  return related && ['pending', 'confirmed', 'inProgress', 'in_progress'].includes(status);
}
