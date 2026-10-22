import {
  REVIEW_RESPONSE_MAX_LENGTH,
  isManualOrderLockedError,
  isReviewResponseConflict,
  nursePassageCreateErrorMessage,
  nursePassageSeriesErrorMessage,
  reviewResponseErrorMessage,
  tourOptimizeErrorMessage,
} from '@oneandlab/shared-api';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import { apiErrorMessage } from '@/lib/errors/handle-api-error';

describe('messages d’erreur API par statut et code', () => {
  it('passages : 404 introuvable, 403 accès refusé, 500 générique, 400 garde le détail serveur', () => {
    expect(nursePassageCreateErrorMessage(404, 'NOT_FOUND')).toMatch(/introuvable/);
    expect(nursePassageSeriesErrorMessage(404, 'NOT_FOUND')).toMatch(/n’existe plus/);
    expect(nursePassageSeriesErrorMessage(403, 'FORBIDDEN')).toMatch(/pas accès/);
    expect(nursePassageSeriesErrorMessage(500, undefined)).toMatch(/Réessayez/);
    expect(nursePassageSeriesErrorMessage(400, undefined)).toBeNull();
    expect(nursePassageCreateErrorMessage(null, undefined)).toBeNull();
  });

  it('tri de tournée : verrou manuel distinct de l’échec serveur', () => {
    expect(isManualOrderLockedError(409, 'manual_order_locked')).toBe(true);
    expect(isManualOrderLockedError(409, 'OTHER')).toBe(false);
    expect(tourOptimizeErrorMessage(409, 'manual_order_locked')).toMatch(/verrouillé/);
    expect(tourOptimizeErrorMessage(500, undefined)).toMatch(/Tri de la tournée impossible/);
    expect(tourOptimizeErrorMessage(400, undefined)).toBeNull();
  });

  it('réponse à un avis : conflit 409 et limite de longueur', () => {
    expect(REVIEW_RESPONSE_MAX_LENGTH).toBe(4000);
    expect(isReviewResponseConflict(409, 'RESPONSE_ALREADY_EXISTS')).toBe(true);
    expect(reviewResponseErrorMessage(409, 'RESPONSE_ALREADY_EXISTS')).toBe('Vous avez déjà répondu à cet avis.');
    expect(reviewResponseErrorMessage(400, 'VALIDATION_ERROR')).toContain('4000');
    expect(reviewResponseErrorMessage(500, undefined)).toBeNull();
  });
});

describe('apiErrorMessage (mobile)', () => {
  it('préfère le message du domaine pour une ApiRequestError', () => {
    const err = new ApiRequestError('Série introuvable', 404, 'NOT_FOUND');
    expect(apiErrorMessage(err, nursePassageSeriesErrorMessage)).toMatch(/n’existe plus/);
  });

  it('garde le message serveur quand le résolveur ne sait pas', () => {
    const err = new ApiRequestError('Date invalide', 400, undefined);
    expect(apiErrorMessage(err, nursePassageSeriesErrorMessage)).toBe('Date invalide');
  });

  it('garde le message client pour une erreur non HTTP', () => {
    expect(apiErrorMessage(new Error('Réseau indisponible'), tourOptimizeErrorMessage)).toBe('Réseau indisponible');
  });
});
