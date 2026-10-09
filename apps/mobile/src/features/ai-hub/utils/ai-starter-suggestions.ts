import type { MobileRole } from '@oneandlab/shared-constants';
import type { AiQuickSuggestion } from '@oneandlab/shared-types';
import type { AiConversationContext } from './ai-conversation-context';
import { mapSuggestionToMessage } from './ai-navigation';

/** Question proposée : `label` court sur le bouton, `message` envoyé à Cary. */
export type AiPromptSuggestion = { key: string; label: string; message: string };

const STARTER_COUNT = 3;

const PATIENT_APPOINTMENT: AiPromptSuggestion[] = [
  { key: 'apt-prepare', label: 'Comment me préparer ?', message: 'Comment dois-je me préparer pour ce rendez-vous ?' },
  { key: 'apt-fasting', label: 'Faut-il être à jeun ?', message: 'Dois-je être à jeun pour ce rendez-vous ?' },
  { key: 'apt-documents', label: 'Quels documents prévoir ?', message: 'Quels documents dois-je préparer pour ce rendez-vous ?' },
];

const PATIENT_LAB_RESULT: AiPromptSuggestion[] = [
  { key: 'result-explain', label: 'Expliquer ce résultat', message: 'Explique-moi ce résultat simplement.' },
  { key: 'result-terms', label: 'Comprendre les termes', message: 'Quels termes de ce résultat dois-je comprendre ?' },
  {
    key: 'result-doctor',
    label: 'Questions pour mon médecin',
    message: 'Quelles questions puis-je poser à mon médecin sur ce résultat ?',
  },
];

const STAFF_PATIENT: AiPromptSuggestion[] = [
  {
    key: 'staff-visit',
    label: 'Prépare un passage',
    message: 'Prépare mon prochain passage chez ce patient : points de vigilance, matériel et documents.',
  },
  { key: 'staff-summary', label: 'Résume le dossier', message: 'Résume le dossier de ce patient.' },
  {
    key: 'staff-missing',
    label: 'Quels documents manquent ?',
    message: 'Quels documents manquent dans le dossier de ce patient ?',
  },
];

const PRELEVEUR: AiPromptSuggestion[] = [
  {
    key: 'collector-prepare',
    label: 'Préparer un prélèvement',
    message: 'Comment préparer un prélèvement : matériel, tubes et ordre de remplissage ?',
  },
  {
    key: 'collector-instructions',
    label: 'Consignes au patient',
    message: 'Quelles consignes donner au patient avant un prélèvement (jeûne, médicaments) ?',
  },
  {
    key: 'collector-tubes',
    label: 'Conserver les tubes',
    message: 'Comment conserver et transporter les tubes après le prélèvement ?',
  },
];

const PATIENT_FALLBACK_IDS = ['book', 'lab_results', 'general'];

function fromQuick(quick: AiQuickSuggestion[]): AiPromptSuggestion[] {
  const items = quick.length > 0 ? quick : PATIENT_FALLBACK_IDS.map((id) => ({ id, label: '' }));
  return items.slice(0, STARTER_COUNT).map((item) => ({
    key: item.id,
    label: item.label || mapSuggestionToMessage(item.id),
    message: mapSuggestionToMessage(item.id),
  }));
}

/**
 * Trois questions de départ adaptées au rôle et à l'objet de la conversation.
 * Soignant sans patient : aucune (l'écran propose d'abord de choisir un patient).
 */
export function buildAiStarterSuggestions(input: {
  role: MobileRole;
  context: AiConversationContext;
  quick: AiQuickSuggestion[];
}): AiPromptSuggestion[] {
  const { role, context, quick } = input;
  if (role === 'preleveur') return PRELEVEUR;
  if (role === 'nurse' || role === 'pro') {
    return context.kind === 'object' && context.patientId ? STAFF_PATIENT : [];
  }
  if (context.kind === 'object' && context.contextType === 'appointment') return PATIENT_APPOINTMENT;
  if (context.kind === 'object' && context.contextType === 'lab_result') return PATIENT_LAB_RESULT;
  return fromQuick(quick);
}

/** Relances proposées sous la dernière réponse (`data.suggestions`). */
export function followUpPromptSuggestions(messages: string[]): AiPromptSuggestion[] {
  return messages.map((message, index) => ({ key: `follow-${index}`, label: message, message }));
}
