import type { AppointmentDetailRole } from './appointment-detail-role-config';

/** Libellés onglets fiche RDV mobile (pro / infirmier). */
export const appointmentDetailTabLabels = {
  infos: 'Infos',
  documents: 'Documents',
} as const;

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
