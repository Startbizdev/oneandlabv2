import { SESSION_EXPIRED_MESSAGE } from '@/lib/auth/session-expiry';
import { ApiRequestError } from '@/lib/errors/api-request-error';

/** Longueur maximale d'un message envoyé à Cary (refus serveur `AI_MESSAGE_TOO_LONG` au-delà). */
export const AI_MESSAGE_MAX_LENGTH = 4000;

/** Délai maximal d'une réponse Cary (outils + modèle) avant abandon côté appareil. */
export const AI_CHAT_TIMEOUT_MS = 120_000;

export class AiChatTimeoutError extends Error {
  constructor() {
    super('AI_CHAT_TIMEOUT');
    this.name = 'AiChatTimeoutError';
  }
}

/** Flux terminé par `event: error` (code et `retry_after` du serveur) ou coupé avant la réponse finale. */
export class AiChatStreamError extends Error {
  constructor(
    readonly code?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(code ?? 'AI_STREAM_INCOMPLETE');
    this.name = 'AiChatStreamError';
  }
}

const UNAVAILABLE = 'Cary est momentanément indisponible. Réessayez dans quelques minutes.';
const STREAM_CUT = 'La réponse de Cary a été coupée. Réessayez.';

/** Nombre lisible en français (« 10 000 »), identique sur tous les moteurs JS. */
export function formatCount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
}

export function formatAiMessageMaxLength(): string {
  return formatCount(AI_MESSAGE_MAX_LENGTH);
}

/** Délai `Retry-After` lisible : « 30 s », « 2 min ». */
export function formatRetryDelay(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, seconds)} s`;
  return `${Math.ceil(seconds / 60)} min`;
}

function rateLimited(retryAfterSeconds?: number): string {
  return retryAfterSeconds
    ? `Trop de messages d'affilée. Réessayez dans ${formatRetryDelay(retryAfterSeconds)}.`
    : "Trop de messages d'affilée. Patientez un instant puis réessayez.";
}

function unavailable(retryAfterSeconds?: number): string {
  return retryAfterSeconds
    ? `Cary est momentanément indisponible. Réessayez dans ${formatRetryDelay(retryAfterSeconds)}.`
    : UNAVAILABLE;
}

/** Codes du contrat `/ai/*` (réponse HTTP ou événement SSE `error`). */
function messageForCode(code: string | undefined, retryAfterSeconds?: number): string | null {
  switch (code) {
    case 'AI_MESSAGE_TOO_LONG':
      return `Message trop long : ${formatAiMessageMaxLength()} caractères maximum.`;
    case 'AI_ROLE_NOT_SUPPORTED':
      return "Cary n'est pas disponible pour votre profil.";
    case 'AI_UNAVAILABLE':
      return unavailable(retryAfterSeconds);
    case 'AI_RATE_LIMITED':
      return rateLimited(retryAfterSeconds);
    case 'AI_MESSAGE_IN_PROGRESS':
      return 'Cary termine encore sa réponse à ce message. Réessayez dans quelques secondes.';
    case 'VOICE_SESSION_ENDED':
      return 'La conversation vocale est terminée. Relancez le mode vocal pour continuer.';
    case 'VALIDATION_ERROR':
      return "Ce message n'a pas pu être traité. Modifiez-le puis réessayez.";
    case 'FORBIDDEN':
      return "Vous n'avez pas accès à cette conversation.";
    case 'NOT_FOUND':
      return "Cette conversation n'existe plus.";
    case 'AI_CONVERSATION_SYSTEM':
      return 'Cette conversation ne peut pas être supprimée.';
    case 'AI_REGENERATE_NOT_LAST':
      return 'Une réponse plus récente existe déjà. Actualisez la conversation.';
    case 'AI_REGENERATE_NOT_ALLOWED':
      return 'Cette réponse ne peut pas être régénérée. Reformulez votre question.';
    default:
      return null;
  }
}

const REGENERATE_REFUSED = new Set(['AI_REGENERATE_NOT_LAST', 'AI_REGENERATE_NOT_ALLOWED']);

/** Régénération refusée pour de bon (plus la dernière réponse, sans question liée, déjà remplacée) : action masquée. */
export function isRegenerateRefused(err: unknown): boolean {
  if (err instanceof AiChatStreamError) return REGENERATE_REFUSED.has(err.code ?? '');
  return err instanceof ApiRequestError && (REGENERATE_REFUSED.has(err.code ?? '') || err.status === 404);
}

/** Échec de « Régénérer » : la réponse précédente reste affichée, ce message l'explique. */
export function aiRegenerateErrorMessage(err: unknown): string {
  if (err instanceof ApiRequestError && err.status === 404) {
    return 'Cette réponse a déjà été remplacée. Actualisez la conversation.';
  }
  return aiChatErrorMessage(err);
}

function messageForStatus(err: ApiRequestError): string {
  const byCode = messageForCode(err.code, err.retryAfterSeconds);
  if (byCode) return byCode;
  if (err.code === 'INVALID_API_RESPONSE' || err.message === SESSION_EXPIRED_MESSAGE) return err.message;
  switch (err.status) {
    case null:
      return 'Connexion impossible. Vérifiez votre réseau puis réessayez.';
    case 400:
      return "Ce message n'a pas pu être traité. Modifiez-le puis réessayez.";
    case 403:
      return "Vous n'avez pas accès à cette conversation.";
    case 404:
      return "Cette conversation n'existe plus.";
    case 409:
      return 'Cette action a déjà été prise en compte. Actualisez la conversation.';
    case 429:
      return rateLimited(err.retryAfterSeconds);
    case 503:
      return unavailable(err.retryAfterSeconds);
    default:
      return UNAVAILABLE;
  }
}

/** Message français affichable pour tout échec Cary : jamais de texte technique ni de code HTTP. */
export function aiChatErrorMessage(err: unknown): string {
  if (err instanceof AiChatTimeoutError) return 'Cary met trop de temps à répondre. Réessayez.';
  if (err instanceof AiChatStreamError) {
    if (!err.code) return STREAM_CUT;
    return messageForCode(err.code, err.retryAfterSeconds) ?? 'Une erreur est survenue. Réessayez ou reformulez votre message.';
  }
  if (err instanceof ApiRequestError) return messageForStatus(err);
  return UNAVAILABLE;
}

/** Changement de conversation refusé pendant qu'une réponse s'affiche. */
export class AiBusyError extends Error {
  constructor() {
    super('Attendez la fin de la réponse de Cary, ou arrêtez-la.');
    this.name = 'AiBusyError';
  }
}

/** Action hors chat (historique, export) : erreur serveur traduite, sinon message propre à l'action. */
export function aiActionErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AiBusyError) return err.message;
  return err instanceof ApiRequestError ? messageForStatus(err) : fallback;
}
