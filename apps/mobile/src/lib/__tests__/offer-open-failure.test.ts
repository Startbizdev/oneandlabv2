import { ApiRequestError } from '../errors/api-request-error';
import { offerOpenFailureFromError } from '../errors/offer-open-failure';

describe('offerOpenFailureFromError', () => {
  it('maps a missing server response to network', () => {
    expect(offerOpenFailureFromError(new ApiRequestError('Erreur réseau', null))).toBe('network');
  });

  it('maps 403 FORBIDDEN to forbidden', () => {
    expect(offerOpenFailureFromError(new ApiRequestError('Accès refusé', 403, 'FORBIDDEN'))).toBe(
      'forbidden',
    );
  });

  it('maps 404 NOT_FOUND to not_found', () => {
    expect(offerOpenFailureFromError(new ApiRequestError('Introuvable', 404, 'NOT_FOUND'))).toBe(
      'not_found',
    );
  });

  it('maps other HTTP statuses to error', () => {
    expect(offerOpenFailureFromError(new ApiRequestError('Erreur serveur', 500, 'SERVER_ERROR'))).toBe(
      'error',
    );
  });

  it('maps non-HTTP exceptions to error', () => {
    expect(offerOpenFailureFromError(new Error('boom'))).toBe('error');
  });

  it('keeps ApiRequestError an Error carrying status and code', () => {
    const error = new ApiRequestError('Accès refusé', 403, 'FORBIDDEN');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Accès refusé');
    expect(error.status).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});
