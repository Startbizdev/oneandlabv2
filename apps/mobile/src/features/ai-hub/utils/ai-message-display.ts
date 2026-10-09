import { stripDisclaimerFromAssistantText } from './strip-disclaimer-from-text';

/** Mention de pièce jointe ajoutée par le serveur au message utilisateur stocké (contexte du modèle). */
const USER_ATTACHMENT_ANNOTATION =
  /\s*\[(?:Document\(s\) joint\(s\) dans ce message|Question sur le document déjà analysé dans cette conversation)\s*:[^\]]*\]/g;

/** Citations brutes du modèle (`[ref:doc:uuid:0]`) : remplacées par les pastilles de sources. */
const CITATION_REF = /[ \t]*\[ref:[^\]\n]*\]/g;
/** Citation encore incomplète en fin de flux (`[ref:doc:12`) : masquée jusqu'à sa fermeture. */
const TRAILING_PARTIAL_REF = /[ \t]*\[(?:r(?:e(?:f(?::[^\]\n]*)?)?)?)?$/;

/** Texte utilisateur affichable : sans annotation technique serveur. */
export function userMessageDisplayText(text: string): string {
  return text.replace(USER_ATTACHMENT_ANNOTATION, '').trim();
}

/** Retire les citations brutes en conservant paragraphes et listes. */
export function stripCitationRefs(text: string): string {
  return text.replace(CITATION_REF, '').replace(TRAILING_PARTIAL_REF, '');
}

/** Texte assistant affichable : sans rappel répété, citation brute ni clé interne. */
export function assistantMessageDisplayText(text: string, disclaimer?: string): string {
  return stripDisclaimerFromAssistantText(stripCitationRefs(text), disclaimer);
}
