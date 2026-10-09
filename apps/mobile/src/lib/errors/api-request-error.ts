/** Échec HTTP : `status` est null quand le serveur n'a pas répondu (réseau, délai). */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code?: string,
    /** Dossier déjà porteur de l'e-mail (409 `EMAIL_ALREADY_USED` de `POST /patients`). */
    readonly existingPatientId?: string,
    /** En-tête `Retry-After` d'une réponse 429 / 503, en secondes. */
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/** Valeur `Retry-After` en secondes (délai entier ou date HTTP), sinon `undefined`. */
export function parseRetryAfterSeconds(value: unknown, now = Date.now()): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const raw = String(value).trim();
  if (!raw) return undefined;
  if (/^\d+$/.test(raw)) return Number(raw);
  const at = Date.parse(raw);
  if (Number.isNaN(at)) return undefined;
  return Math.max(0, Math.ceil((at - now) / 1000));
}
