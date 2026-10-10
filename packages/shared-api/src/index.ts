/**
 * Contrat API — source: frontend/utils/api.ts
 */

export * from './api-error-messages';
export * from './contact-client';
export * from './patient-adopt';

/** Routes publiques sans CSRF */
export const PUBLIC_API_ROUTES = [
  '/auth/check-email',
  '/auth/request-otp',
  '/auth/verify-otp',
  '/auth/login',
  '/auth/password/forgot',
  '/auth/password/reset',
  '/auth/guest-to-user',
  '/auth/csrf-token',
  '/auth/logout',
  '/ban/search',
  '/registration-requests',
  '/contact',
  '/qr/resolve',
  '/qr/visit',
] as const;

export const CSRF_ERROR_CODES = [
  'CSRF_TOKEN_MISSING',
  'CSRF_TOKEN_INVALID',
] as const;

/**
 * Session refusée par `AuthMiddleware` (jeton absent, invalide, expiré ou compte introuvable).
 * Une panne serveur pendant l'authentification répond 500 : elle ne doit pas déconnecter.
 */
export function isSessionRejected(status: number | null | undefined, code: string | null | undefined): boolean {
  return status === 401 && code === 'UNAUTHORIZED';
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
  /** 409 `EMAIL_ALREADY_USED` de `POST /patients` : dossier déjà porteur de l'e-mail. */
  existing_patient_id?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages?: number;
  };
  /** Compteurs des segments de commandes pharmacie, hors filtre de recherche. */
  counts?: {
    active: number;
    history: number;
  };
}

export function requiresCsrf(path: string, method: string): boolean {
  if (['GET', 'OPTIONS'].includes(method.toUpperCase())) return false;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return !PUBLIC_API_ROUTES.some((route) => normalized.startsWith(route));
}

/** Transport HTTP de l'app (ex. `apiRequest` mobile) : ajoute token, CSRF et base URL. */
export type ApiRequester = <T>(
  path: string,
  options: { method: 'DELETE' | 'POST'; body?: unknown },
) => Promise<ApiResponse<T>>;

/** Phrase exacte exigée par DELETE /auth/account. */
export const ACCOUNT_DELETION_CONFIRMATION = 'SUPPRIMER';

export const ACCOUNT_DELETION_REASON_MAX_LENGTH = 1000;

/** Codes `code` renvoyés par les deux endpoints de suppression de compte. */
export type AccountDeletionErrorCode =
  | 'CONFIRMATION_REQUIRED'
  | 'NOT_PATIENT'
  | 'NOT_FOUND'
  | 'ACTIVE_APPOINTMENTS'
  | 'ACTIVE_SUBSCRIPTION'
  | 'ACTIVE_PHARMACY_ORDERS'
  | 'PATIENT_USE_SELF_SERVICE'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'EMAIL_SEND_FAILED'
  | 'SERVER_ERROR';

export interface DeleteMyAccountResult {
  deleted: true;
  deleted_documents: number;
  deleted_reviews: number;
}

export interface AccountDeletionRequestResult {
  requested: true;
}

export function createAccountDeletionApi(request: ApiRequester) {
  return {
    /** Patient uniquement : suppression définitive et immédiate du compte connecté. */
    deleteMyAccount(confirmation: typeof ACCOUNT_DELETION_CONFIRMATION) {
      return request<DeleteMyAccountResult>('/auth/account', {
        method: 'DELETE',
        body: { confirmation },
      });
    },
    /** Professionnels : demande de suppression transmise au support (refusée aux patients). */
    requestAccountDeletion(reason?: string) {
      return request<AccountDeletionRequestResult>('/auth/account-deletion-request', {
        method: 'POST',
        body: reason === undefined ? {} : { reason },
      });
    },
  };
}

/** URL pending offers — source: frontend/layouts/dashboard.vue appointmentsPendingOffersUrl */
export function appointmentsPendingOffersQuery(role: string): string {
  const qs = new URLSearchParams({ status: 'pending', limit: '100' });
  if (role === 'nurse') {
    qs.set('nurse_tab', 'soins');
    qs.set('nurse_segment', 'en_attente');
  }
  return `/appointments?${qs.toString()}`;
}
