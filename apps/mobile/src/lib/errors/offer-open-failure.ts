import { ApiRequestError } from './api-request-error';

export type OpenIncomingOfferFailure =
  | 'invalid'
  | 'unavailable'
  | 'already_accepted'
  | 'forbidden'
  | 'not_found'
  | 'network'
  | 'error';

/** GET /appointments/:id : 403 `FORBIDDEN`, 404 `NOT_FOUND`, pas de réponse = réseau. */
export function offerOpenFailureFromError(error: unknown): OpenIncomingOfferFailure {
  if (!(error instanceof ApiRequestError)) return 'error';
  if (error.status === null) return 'network';
  if (error.status === 403) return 'forbidden';
  if (error.status === 404) return 'not_found';
  return 'error';
}
