import { SESSION_EXPIRED_MESSAGE } from '@/lib/auth/session-expiry';
import { ApiRequestError } from '@/lib/errors/api-request-error';

export const ASSISTANT_MESSAGE_MAX_LENGTH = 4000;
export const DICTATION_MAX_LENGTH = 8000;

/** Flux terminé par `event: error`, ou coupé avant `done` (pas de code). */
export class AssistantStreamError extends Error {
  constructor(
    readonly code?: string,
    readonly retryAfter?: number,
  ) {
    super(code ?? 'ASSISTANT_STREAM_INCOMPLETE');
    this.name = 'AssistantStreamError';
  }
}

const UNAVAILABLE = 'Cary est momentanément indisponible. Réessayez dans quelques minutes.';

const STATUS_CODES: Record<number, string> = {
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'ASSISTANT_MESSAGE_IN_PROGRESS',
  429: 'ASSISTANT_RATE_LIMITED',
  503: 'ASSISTANT_UNAVAILABLE',
};

function delay(seconds: number): string {
  return seconds < 60 ? `${Math.max(1, seconds)} s` : `${Math.ceil(seconds / 60)} min`;
}

function messageForCode(code: string | undefined, retryAfter?: number): string | null {
  switch (code) {
    case 'ASSISTANT_RATE_LIMITED':
      return retryAfter
        ? `Trop de messages d'affilée. Réessayez dans ${delay(retryAfter)}.`
        : "Trop de messages d'affilée. Patientez un instant puis réessayez.";
    case 'ASSISTANT_UNAVAILABLE':
      return UNAVAILABLE;
    case 'ASSISTANT_TIMEOUT':
      return 'Cary met trop de temps à répondre. Réessayez.';
    case 'ASSISTANT_ROLE_NOT_SUPPORTED':
      return "Cary n'est pas disponible pour votre profil.";
    case 'ASSISTANT_MESSAGE_IN_PROGRESS':
      return 'Cary termine encore sa réponse à ce message. Réessayez dans quelques secondes.';
    case 'VALIDATION_ERROR':
      return "Ce message n'a pas pu être traité. Modifiez-le puis réessayez.";
    case 'FORBIDDEN':
      return "Vous n'avez pas accès à cette conversation.";
    case 'NOT_FOUND':
      return "Cette conversation n'existe plus.";
    default:
      return null;
  }
}

/** Message français affichable pour tout échec de l'assistant : jamais de texte technique ni de code HTTP. */
export function assistantErrorMessage(err: unknown): string {
  if (err instanceof AssistantStreamError) {
    return messageForCode(err.code, err.retryAfter) ?? 'La réponse de Cary a été coupée. Réessayez.';
  }
  if (err instanceof ApiRequestError) {
    if (err.message === SESSION_EXPIRED_MESSAGE) return err.message;
    if (err.status === null) return 'Connexion impossible. Vérifiez votre réseau puis réessayez.';
    const byCode =
      messageForCode(err.code, err.retryAfterSeconds) ?? messageForCode(STATUS_CODES[err.status], err.retryAfterSeconds);
    if (byCode) return byCode;
  }
  return UNAVAILABLE;
}

/** Erreurs pour lesquelles renvoyer le même message n'a aucune chance d'aboutir. */
export function isAssistantErrorRetryable(err: unknown): boolean {
  const code = err instanceof AssistantStreamError || err instanceof ApiRequestError ? err.code : undefined;
  return !['ASSISTANT_ROLE_NOT_SUPPORTED', 'VALIDATION_ERROR', 'FORBIDDEN'].includes(code ?? '');
}
