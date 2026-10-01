import { isSessionRejected } from '@oneandlab/shared-api';
import { getAuthToken } from '@/lib/auth-token';

/** Un 401 sur ces routes signale un échec d'identification ou de déconnexion, pas une session expirée. */
const SESSION_EXPIRY_EXEMPT_ROUTES = [
  '/auth/login',
  '/auth/logout',
  '/auth/request-otp',
  '/auth/verify-otp',
] as const;

export const SESSION_EXPIRED_MESSAGE = 'Votre session a expiré. Reconnectez-vous.';

type SessionExpiredHandler = () => Promise<void>;

let handler: SessionExpiredHandler | null = null;
let pending: Promise<void> | null = null;

/** Enregistré par le store d'authentification (le client API ne peut pas l'importer : cycle). */
export function setSessionExpiredHandler(next: SessionExpiredHandler | null): void {
  handler = next;
}

/** Vrai si une requête envoyée avec un jeton a été refusée parce que la session n'est plus valide. */
export function isSessionExpiryResponse(path: string, status: number | null, code: string | undefined): boolean {
  if (SESSION_EXPIRY_EXEMPT_ROUTES.some((route) => path.startsWith(route))) return false;
  return isSessionRejected(status, code);
}

/**
 * Efface la session une seule fois, même si plusieurs requêtes reçoivent un 401 en parallèle.
 * Ignoré si la session qui a envoyé la requête a déjà été effacée ou remplacée.
 */
export function notifySessionExpired(sentToken: string): Promise<void> {
  if (sentToken !== getAuthToken()) return pending ?? Promise.resolve();
  if (!pending) {
    const run = handler;
    pending = (run ? run() : Promise.resolve())
      .catch((error: unknown) => {
        console.warn('[auth] effacement de la session expirée en échec', error);
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}
