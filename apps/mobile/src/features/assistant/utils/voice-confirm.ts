import type { AssistantMessage } from '@oneandlab/shared-types';

/** « Oui », « d'accord », « vas-y », « c'est bon »… : réponse courte qui valide la proposition précédente. */
const AFFIRMATIVE =
  /^(oui|ouais|ok|okay|d'?accord|dac|parfait|vas-?y|allez-?y|c'?est bon|ça me va|ca me va|ça marche|ca marche|go|valide|je valide|confirme|je confirme|réserve|reserve)\b/;

export function isAffirmative(utterance: string): boolean {
  const text = utterance
    .trim()
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[.!,?\s]+$/g, '');
  return text.length > 0 && text.split(/\s+/).length <= 5 && AFFIRMATIVE.test(text);
}

/**
 * Mode vocal : un « oui » juste après une proposition de réservation ouvre la réservation préremplie
 * (au lieu de repartir vers l'IA). Le patient vérifie et confirme dans le formulaire.
 */
export function voiceBookingConfirmation(utterance: string, messages: readonly AssistantMessage[]) {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant' || !isAffirmative(utterance)) return null;
  return last.actions.find((a) => a.type === 'book_appointment') ?? null;
}
