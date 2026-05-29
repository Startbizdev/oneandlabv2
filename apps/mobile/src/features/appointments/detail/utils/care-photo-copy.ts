import type { Appointment } from '@oneandlab/shared-types';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { capitalizeFrench } from '@/utils/appointment-datetime-fr';
import type { AppointmentDetailRole } from './appointment-detail-role-config';

dayjs.locale('fr');

export function carePhotosPanelIntro(role: AppointmentDetailRole | string): string {
  if (role === 'pro') {
    return 'Échangez sur l’avancée des soins avec l’infirmier(ère) assigné(e). Ajoutez des photos pour documenter le suivi.';
  }
  if (role === 'nurse') {
    return 'Échangez sur l’avancée des soins avec le professionnel de santé prescripteur. Ajoutez des photos pour documenter le suivi.';
  }
  return 'Photos de soins partagées entre l’infirmier(ère) et le professionnel de santé.';
}

export function carePhotoDiscussionHint(role: AppointmentDetailRole | string): string {
  if (role === 'pro') return 'Avec l’infirmier(ère)';
  if (role === 'nurse') return 'Avec le pro prescripteur';
  return 'Suivi des soins';
}

/** Sous-titre header échanges : date RDV + interlocuteur. */
export function carePhotoDiscussionHeaderSubtitle(
  apt: Appointment | null | undefined,
  role: AppointmentDetailRole | string,
): string {
  const hint = carePhotoDiscussionHint(role);
  const raw = apt?.scheduled_at;
  if (!raw) return hint;
  const date = capitalizeFrench(dayjs(raw).format('ddd D MMMM YYYY'));
  return `${date} · ${hint}`;
}

export function carePhotoComposerPlaceholder(role: AppointmentDetailRole | string): string {
  if (role === 'pro') return 'Message pour l’infirmier(ère)…';
  if (role === 'nurse') return 'Message pour le professionnel de santé…';
  return 'Votre message…';
}
