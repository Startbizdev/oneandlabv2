import type { MobileRole } from '@oneandlab/shared-constants';
import type { AssistantContextType } from '@oneandlab/shared-types';

/** Question de départ : `label` sur la puce, `message` envoyé à Cary. */
export type StarterSuggestion = { label: string; message: string };

const PATIENT: StarterSuggestion[] = [
  { label: 'Mon prochain rendez-vous', message: 'Quand est mon prochain rendez-vous ?' },
  { label: 'Prendre rendez-vous', message: 'Je souhaite prendre rendez-vous pour une prise de sang.' },
  { label: 'Expliquer mes résultats', message: 'Explique-moi simplement mes derniers résultats d’analyse.' },
];

const PATIENT_APPOINTMENT: StarterSuggestion[] = [
  { label: 'Comment me préparer ?', message: 'Comment dois-je me préparer pour ce rendez-vous ?' },
  { label: 'Faut-il être à jeun ?', message: 'Dois-je être à jeun pour ce rendez-vous ?' },
  { label: 'Quels documents prévoir ?', message: 'Quels documents dois-je préparer pour ce rendez-vous ?' },
];

const LAB_RESULT: StarterSuggestion[] = [
  { label: 'Expliquer ce résultat', message: 'Explique-moi ce résultat simplement.' },
  { label: 'Questions pour le médecin', message: 'Quelles questions poser au médecin sur ce résultat ?' },
];

const NURSE: StarterSuggestion[] = [
  { label: 'Ma tournée du jour', message: 'Résume ma tournée d’aujourd’hui.' },
  { label: 'Mes prochains rendez-vous', message: 'Quels sont mes prochains rendez-vous ?' },
];

const PRO: StarterSuggestion[] = [
  { label: 'Mes prochains rendez-vous', message: 'Quels sont mes prochains rendez-vous ?' },
  { label: 'Planifier un rendez-vous', message: 'Je veux planifier un rendez-vous pour un patient.' },
];

const PRELEVEUR: StarterSuggestion[] = [
  { label: 'Ma tournée du jour', message: 'Résume ma tournée d’aujourd’hui.' },
  { label: 'Conserver les tubes', message: 'Comment conserver et transporter les tubes après un prélèvement ?' },
  { label: 'Consignes au patient', message: 'Quelles consignes donner au patient avant un prélèvement ?' },
];

const STAFF_PATIENT: StarterSuggestion[] = [
  { label: 'Résumer le dossier', message: 'Résume le dossier de ce patient.' },
  { label: 'Préparer le passage', message: 'Prépare mon prochain passage chez ce patient : points de vigilance et matériel.' },
  { label: 'Derniers résultats', message: 'Quels sont les derniers résultats d’analyse de ce patient ?' },
];

/** Suggestions statiques selon le rôle, le contexte et le patient sélectionné (aucun appel réseau). */
export function starterSuggestions(
  role: MobileRole,
  contextType: AssistantContextType | undefined,
  patientSelected: boolean,
): StarterSuggestion[] {
  if (contextType === 'lab_result') return LAB_RESULT;
  if (role === 'patient') return contextType === 'appointment' ? PATIENT_APPOINTMENT : PATIENT;
  if (patientSelected) return STAFF_PATIENT;
  if (role === 'nurse') return NURSE;
  if (role === 'pro') return PRO;
  return PRELEVEUR;
}
