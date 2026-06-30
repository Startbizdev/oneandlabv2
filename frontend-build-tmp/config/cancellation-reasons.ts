/**
 * Raisons d'annulation (même liste que le backend).
 * Photo optionnelle uniquement pour wrong_address et access_impossible.
 */
export const CANCELLATION_REASONS: Record<string, string> = {
  reschedule: 'Modification du rendez-vous (report, autre créneau)',
  patient_unreachable: 'Patient injoignable (ne répond pas au téléphone)',
  patient_absent: 'Patient absent au moment du passage',
  wrong_address: 'Adresse incorrecte ou introuvable',
  patient_request: 'Demande du patient',
  access_impossible: 'Accès impossible (domicile inaccessible, refus d\'accès)',
  booking_error: 'Erreur de prise de rendez-vous (doublon, mauvaise date)',
  other: 'Autre',
};

export const CANCELLATION_REASONS_WITH_PHOTO = ['wrong_address', 'access_impossible'];

export const CANCELLATION_REASON_OPTIONS = Object.entries(CANCELLATION_REASONS).map(([value, label]) => ({
  value,
  label,
}));
