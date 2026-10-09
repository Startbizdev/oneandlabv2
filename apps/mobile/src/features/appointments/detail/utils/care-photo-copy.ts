import type { AppointmentDetailRole } from './appointment-detail-role-config';

export function carePhotoDiscussionHint(role: AppointmentDetailRole | string): string | undefined {
  if (role === 'pro') return 'Avec l’infirmier(ère)';
  if (role === 'nurse') return 'Avec le prescripteur';
  return undefined;
}

export function carePhotoComposerPlaceholder(role: AppointmentDetailRole | string): string {
  if (role === 'pro') return 'Message pour l’infirmier(ère)…';
  if (role === 'nurse') return 'Message pour le prescripteur…';
  return 'Votre message…';
}
