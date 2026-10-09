import { ApiRequestError } from '@/lib/errors/api-request-error';
import { aiActionErrorMessage, formatAiMessageMaxLength, formatCount, formatRetryDelay } from './ai-chat-errors';

export type AiReportAction = 'dictate' | 'validate';

/** Longueur maximale d'un compte rendu corrigé (refus serveur `AI_REPORT_TOO_LONG` au-delà). */
export const AI_REPORT_MAX_LENGTH = 10_000;

function retryIn(seconds: number | undefined): string {
  return seconds ? `Réessayez dans ${formatRetryDelay(seconds)}.` : 'Réessayez dans un instant.';
}

/** 409 : compte rendu déjà validé ou publié, il ne peut plus être corrigé ni validé. */
export function isAiReportLocked(err: unknown): boolean {
  return err instanceof ApiRequestError && err.status === 409;
}

/**
 * `POST /ai/reports/dictate`, `PATCH /ai/reports/{id}` et `/validate` : message français,
 * jamais le texte brut du serveur. La correction se fait au moment de valider (`validate`).
 */
export function aiReportErrorMessage(err: unknown, action: AiReportAction): string {
  const fallback =
    action === 'dictate' ? 'Impossible de générer le compte rendu. Réessayez.' : 'Impossible de valider le compte rendu. Réessayez.';
  if (!(err instanceof ApiRequestError)) return fallback;
  switch (err.code) {
    case 'AI_MESSAGE_TOO_LONG':
      return `Dictée trop longue : ${formatAiMessageMaxLength()} caractères maximum.`;
    case 'AI_REPORT_TOO_LONG':
      return `Compte rendu trop long : ${formatCount(AI_REPORT_MAX_LENGTH)} caractères maximum.`;
    case 'AI_REPORT_ALREADY_VALIDATED':
      return 'Ce compte rendu est déjà validé : il ne peut plus être modifié.';
    case 'AI_REPORT_ALREADY_PUBLISHED':
      return 'Ce compte rendu est déjà publié : il ne peut plus être modifié.';
  }
  switch (err.status) {
    case 400:
      return action === 'dictate'
        ? 'Dictée incomplète : saisissez vos observations pour ce patient.'
        : 'Le compte rendu ne peut pas être vide.';
    case 403:
      return action === 'dictate'
        ? "Vous n'avez pas accès au dossier de ce patient."
        : 'Vous ne pouvez pas valider ce compte rendu.';
    case 404:
      return action === 'dictate'
        ? "Ce rendez-vous n'est pas rattaché à ce patient."
        : 'Ce compte rendu est introuvable. Générez-le à nouveau.';
    case 409:
      return 'Ce compte rendu ne peut plus être modifié.';
    case 429:
      return `Trop de demandes d'affilée. ${retryIn(err.retryAfterSeconds)}`;
    case 503:
      return `Cary est momentanément indisponible. Votre texte est conservé. ${retryIn(err.retryAfterSeconds)}`;
    default:
      return aiActionErrorMessage(err, fallback);
  }
}
