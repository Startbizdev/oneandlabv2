import type { AppointmentDetailRole } from './appointment-detail-role-config';

export function appointmentConversationHref(
  role: AppointmentDetailRole | string,
  appointmentId: string,
): string {
  const prefix =
    role === 'pro'
      ? '/(pro)'
      : role === 'nurse'
        ? '/(nurse)'
        : role === 'patient'
          ? '/(patient)'
          : '/(pro)';
  return `${prefix}/appointment/${encodeURIComponent(appointmentId)}/conversation`;
}
