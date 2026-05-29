import type { Appointment } from '@oneandlab/shared-types';

/** Valeurs sentinelles — évite un throw qui casse la réhydratation React Query. */
export const APPOINTMENT_ALREADY_ACCEPTED = '__already_accepted__' as const;
export const APPOINTMENT_ACCESS_DENIED = '__access_denied__' as const;

export type AppointmentDetailBlock =
  | typeof APPOINTMENT_ALREADY_ACCEPTED
  | typeof APPOINTMENT_ACCESS_DENIED;

export type AppointmentDetailData = Appointment | AppointmentDetailBlock;

export function isAppointmentDetailAlreadyAccepted(
  data: unknown,
): data is typeof APPOINTMENT_ALREADY_ACCEPTED {
  return data === APPOINTMENT_ALREADY_ACCEPTED;
}

export function isAppointmentDetailAccessDenied(
  data: unknown,
): data is typeof APPOINTMENT_ACCESS_DENIED {
  return data === APPOINTMENT_ACCESS_DENIED;
}

export function isAppointmentDetailBlocked(data: unknown): data is AppointmentDetailBlock {
  return isAppointmentDetailAlreadyAccepted(data) || isAppointmentDetailAccessDenied(data);
}

export function appointmentDetailBlockReason(
  data: unknown,
): AppointmentDetailBlock | null {
  if (isAppointmentDetailAlreadyAccepted(data)) return APPOINTMENT_ALREADY_ACCEPTED;
  if (isAppointmentDetailAccessDenied(data)) return APPOINTMENT_ACCESS_DENIED;
  return null;
}

export function isAppointmentAccessDeniedMessage(message: string | null | undefined): boolean {
  return /accès refusé/i.test(String(message ?? '').trim());
}

export function resolveAppointmentDetail(
  data: AppointmentDetailData | null | undefined,
): Appointment | null {
  if (!data || isAppointmentDetailBlocked(data)) return null;
  return data;
}

export function appointmentDetailBlockedCopy(
  block: AppointmentDetailBlock | null,
): { emoji: string; title: string; description: string } {
  if (block === APPOINTMENT_ALREADY_ACCEPTED) {
    return {
      emoji: '😔',
      title: 'Rendez-vous inaccessible',
      description: 'Ce rendez-vous a déjà été accepté par un autre professionnel.',
    };
  }
  if (block === APPOINTMENT_ACCESS_DENIED) {
    return {
      emoji: '🔒',
      title: 'Accès refusé',
      description: 'Ce rendez-vous ne vous est pas accessible.',
    };
  }
  return {
    emoji: '😕',
    title: 'Rendez-vous inaccessible',
    description: 'Impossible d’ouvrir ce rendez-vous.',
  };
}
