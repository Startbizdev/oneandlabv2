import {
  REVIEW_RESPONSE_MAX_LENGTH,
  aiBookingDraftErrorMessage,
  isAiDraftClosedError,
  isManualOrderLockedError,
  isReviewResponseConflict,
  nursePassageCreateErrorMessage,
  nursePassageSeriesErrorMessage,
  reviewResponseErrorMessage,
  tourOptimizeErrorMessage,
} from '@oneandlab/shared-api';
import { canBookWithCaryAi } from '@/features/ai-hub/utils/ai-booking-access';
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

  it('brouillons Cary : codes métier et 403 sans code', () => {
    expect(aiBookingDraftErrorMessage(403, undefined)).toMatch(/pas disponible pour votre profil/);
    expect(aiBookingDraftErrorMessage(400, 'DRAFT_NOT_READY')).toMatch(/incomplet/);
    expect(aiBookingDraftErrorMessage(400, 'DRAFT_EXPIRED')).toMatch(/expiré/);
    expect(aiBookingDraftErrorMessage(409, 'DRAFT_ALREADY_CONFIRMED')).toMatch(/déjà été confirmé/);
    expect(aiBookingDraftErrorMessage(409, 'EMAIL_ALREADY_USED')).toMatch(/e-mail est déjà utilisé/);
    expect(aiBookingDraftErrorMessage(409, 'PATIENT_ALREADY_EXISTS')).toMatch(/patient existe déjà avec cet e-mail/);
    expect(aiBookingDraftErrorMessage(400, 'PATIENT_BOOKING_CONSENT_REQUIRED')).toMatch(/consentement du patient/);
    expect(aiBookingDraftErrorMessage(400, 'VALIDATION_ERROR')).toBeNull();
    expect(isAiDraftClosedError('DRAFT_EXPIRED')).toBe(true);
    expect(isAiDraftClosedError('DRAFT_ALREADY_CONFIRMED')).toBe(true);
    expect(isAiDraftClosedError('DRAFT_NOT_READY')).toBe(false);
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

describe('canBookWithCaryAi', () => {
  it('reflète AiBookingAccess::ROLES : le préleveur passe par « Demander un prélèvement »', () => {
    expect(canBookWithCaryAi('patient')).toBe(true);
    expect(canBookWithCaryAi('pro')).toBe(true);
    expect(canBookWithCaryAi('nurse')).toBe(true);
    expect(canBookWithCaryAi('preleveur')).toBe(false);
  });
});
