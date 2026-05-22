/**
 * Raisons d'annulation staff (aligné backend + frontend/config/cancellation-reasons.ts).
 * Photo optionnelle uniquement pour wrong_address et access_impossible.
 */
export const CANCELLATION_REASONS: Record<string, string> = {
  reschedule: 'Modification du rendez-vous (report, autre créneau)',
  patient_unreachable: 'Patient injoignable (ne répond pas au téléphone)',
  patient_absent: 'Patient absent au moment du passage',
  wrong_address: 'Adresse incorrecte ou introuvable',
  patient_request: 'Demande du patient',
  access_impossible: "Accès impossible (domicile inaccessible, refus d'accès)",
  booking_error: 'Erreur de prise de rendez-vous (doublon, mauvaise date)',
  other: 'Autre',
};

export const CANCELLATION_REASONS_WITH_PHOTO = ['wrong_address', 'access_impossible'] as const;

export const CANCELLATION_REASON_OPTIONS = Object.entries(CANCELLATION_REASONS).map(
  ([value, label]) => ({ value, label }),
);

export const CANCELLATION_COMMENT_MIN_LENGTH = 10;
export const CANCELLATION_COMMENT_MAX_LENGTH = 500;

export function cancellationReasonRequiresPhoto(reason: string): boolean {
  return (CANCELLATION_REASONS_WITH_PHOTO as readonly string[]).includes(reason);
}

export function staffCancellationCanSubmit(reason: string, comment: string): boolean {
  if (!reason) return false;
  const trimmed = comment.trim();
  return trimmed.length >= CANCELLATION_COMMENT_MIN_LENGTH;
}
