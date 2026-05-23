import type { AppointmentDetailRole } from './appointment-detail-role-config';

export function carePhotosPanelIntro(role: AppointmentDetailRole | string): string {
  if (role === 'pro') {
    return 'Suivez l’avancée des soins : photos et messages de l’infirmier(ère) assigné(e).';
  }
  if (role === 'nurse') {
    return 'Échangez sur l’avancée des soins avec le professionnel de santé prescripteur. Ajoutez des photos pour documenter le suivi.';
  }
  return 'Photos de soins partagées entre l’infirmier(ère) et le professionnel de santé.';
}

export function carePhotoDiscussionHint(role: AppointmentDetailRole | string): string {
  if (role === 'pro') {
    return 'Échangez avec l’infirmier(ère) sur l’avancée des soins pour ce rendez-vous.';
  }
  if (role === 'nurse') {
    return 'Échangez avec le professionnel de santé sur l’avancée des soins pour ce rendez-vous.';
  }
  return 'Discussion sur l’avancée des soins.';
}

export function carePhotoComposerPlaceholder(role: AppointmentDetailRole | string): string {
  if (role === 'pro') return 'Message pour l’infirmier(ère)…';
  if (role === 'nurse') return 'Message pour le professionnel de santé…';
  return 'Votre message…';
}
