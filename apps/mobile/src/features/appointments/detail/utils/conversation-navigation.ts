import type { AppointmentDetailRole } from './appointment-detail-role-config';
import type { Href } from 'expo-router';

export function appointmentConversationHref(
  role: AppointmentDetailRole | string,
  appointmentId: string,
): Href {
  const prefix =
    role === 'pro'
      ? '/(pro)'
      : role === 'nurse'
        ? '/(nurse)'
        : role === 'patient'
          ? '/(patient)'
          : role === 'preleveur'
            ? '/(preleveur)'
            : '/(pro)';
  return {
    pathname: `${prefix}/appointment/[id]/conversation`,
    params: { id: appointmentId },
  };
}
