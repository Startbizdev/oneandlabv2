import { ApiRequestError } from '@/lib/errors/api-request-error';
import { aiReportErrorMessage, isAiReportLocked } from '../utils/ai-report-errors';

describe('aiReportErrorMessage (compte rendu dicté)', () => {
  it('never shows the raw server text of a 400', () => {
    const err = new ApiRequestError('patient_id et transcript requis', 400, 'VALIDATION_ERROR');
    expect(aiReportErrorMessage(err, 'dictate')).toBe('Dictée incomplète : saisissez vos observations pour ce patient.');
    expect(aiReportErrorMessage(new ApiRequestError('x', 400, 'AI_MESSAGE_TOO_LONG'), 'dictate')).toBe(
      'Dictée trop longue : 4\u202f000 caractères maximum.',
    );
  });

  it('explains 403 and 404 for each action', () => {
    expect(aiReportErrorMessage(new ApiRequestError('Accès refusé', 403, 'FORBIDDEN'), 'dictate')).toBe(
      "Vous n'avez pas accès au dossier de ce patient.",
    );
    expect(aiReportErrorMessage(new ApiRequestError('x', 404, 'NOT_FOUND'), 'dictate')).toBe(
      "Ce rendez-vous n'est pas rattaché à ce patient.",
    );
    expect(aiReportErrorMessage(new ApiRequestError('x', 404, 'NOT_FOUND'), 'validate')).toBe(
      'Ce compte rendu est introuvable. Générez-le à nouveau.',
    );
  });

  it('explains the 409 of correction, validation and publication (status no longer allows it)', () => {
    const validated = new ApiRequestError('x', 409, 'AI_REPORT_ALREADY_VALIDATED');
    expect(aiReportErrorMessage(validated, 'validate')).toBe('Ce compte rendu est déjà validé : il ne peut plus être modifié.');
    expect(isAiReportLocked(validated)).toBe(true);
    expect(aiReportErrorMessage(new ApiRequestError('x', 409, 'AI_REPORT_ALREADY_PUBLISHED'), 'validate')).toBe(
      'Ce compte rendu est déjà publié : il ne peut plus être modifié.',
    );
    expect(aiReportErrorMessage(new ApiRequestError('x', 409), 'validate')).toBe('Ce compte rendu ne peut plus être modifié.');
    expect(isAiReportLocked(new ApiRequestError('x', 404, 'NOT_FOUND'))).toBe(false);
  });

  it('explains a refused correction (PATCH) without the raw server text', () => {
    expect(aiReportErrorMessage(new ApiRequestError('Compte rendu trop long', 400, 'AI_REPORT_TOO_LONG'), 'validate')).toBe(
      'Compte rendu trop long : 10\u202f000 caractères maximum.',
    );
    expect(aiReportErrorMessage(new ApiRequestError('content_text requis', 400, 'VALIDATION_ERROR'), 'validate')).toBe(
      'Le compte rendu ne peut pas être vide.',
    );
  });

  it('keeps the dictation and gives the Retry-After delay on 503 / 429', () => {
    expect(aiReportErrorMessage(new ApiRequestError('x', 503, 'AI_UNAVAILABLE', undefined, 30), 'dictate')).toBe(
      'Cary est momentanément indisponible. Votre texte est conservé. Réessayez dans 30 s.',
    );
    expect(aiReportErrorMessage(new ApiRequestError('x', 429, 'AI_RATE_LIMITED'), 'dictate')).toBe(
      "Trop de demandes d'affilée. Réessayez dans un instant.",
    );
  });

  it('falls back on the action message for unknown failures', () => {
    expect(aiReportErrorMessage(new Error('boom'), 'validate')).toBe('Impossible de valider le compte rendu. Réessayez.');
    expect(aiReportErrorMessage(new ApiRequestError('x', null), 'dictate')).toBe(
      'Connexion impossible. Vérifiez votre réseau puis réessayez.',
    );
  });
});
