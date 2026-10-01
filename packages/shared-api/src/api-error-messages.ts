/**
 * Messages FR des refus API, choisis d'après le statut HTTP et le `code` renvoyés par le backend
 * (web `ApiHttpError`, mobile `ApiRequestError`). `null` : pas de message propre au domaine,
 * l'appelant garde le message du serveur (détail de validation 400) ou du client (réseau).
 */

type HttpStatus = number | null | undefined;
type ErrorCode = string | null | undefined;

export type ApiErrorMessageResolver = (status: HttpStatus, code: ErrorCode) => string | null;

/** Longueur maximale d'une réponse à un avis (`ReviewResponse::MAX_LENGTH`). */
export const REVIEW_RESPONSE_MAX_LENGTH = 4000;

function isServerFailure(status: HttpStatus): boolean {
  return typeof status === 'number' && status >= 500;
}

/** Création d'une série de passages infirmier (`POST /nurse/passages/series`). */
export const nursePassageCreateErrorMessage: ApiErrorMessageResolver = (status) => {
  if (status === 404) return 'Patient ou profil introuvable. Vérifiez le patient et votre adresse professionnelle.';
  if (status === 403) return 'Vous n’avez pas accès au dossier de ce patient.';
  if (isServerFailure(status)) return 'Création du passage impossible pour le moment. Réessayez dans un instant.';
  return null;
};

/** Série existante : détail, modification, suppression, « Planifier ce jour » (`materialize`). */
export const nursePassageSeriesErrorMessage: ApiErrorMessageResolver = (status) => {
  if (status === 404) return 'Ce passage n’existe plus ou son patient est introuvable. Actualisez votre tournée.';
  if (status === 403) return 'Vous n’avez pas accès au dossier de ce patient.';
  if (isServerFailure(status)) return 'Opération sur le passage impossible pour le moment. Réessayez dans un instant.';
  return null;
};

/** Ordre manuel posé par l'utilisateur : le tri automatique exige `force: true`. */
export function isManualOrderLockedError(status: HttpStatus, code: ErrorCode): boolean {
  return status === 409 && code === 'manual_order_locked';
}

/** Tri de la tournée infirmier ou préleveur (`POST /{nurse|preleveur}/tour/optimize`). */
export const tourOptimizeErrorMessage: ApiErrorMessageResolver = (status, code) => {
  if (isManualOrderLockedError(status, code)) {
    return 'Votre ordre manuel est verrouillé. Confirmez pour le remplacer.';
  }
  if (isServerFailure(status)) return 'Tri de la tournée impossible pour le moment. Réessayez dans un instant.';
  return null;
};

/** Premier message propre au domaine parmi plusieurs résolveurs (ex. création patient puis création RDV). */
export function firstApiErrorMessage(...resolvers: ApiErrorMessageResolver[]): ApiErrorMessageResolver {
  return (status, code) => {
    for (const resolve of resolvers) {
      const message = resolve(status, code);
      if (message) return message;
    }
    return null;
  };
}

/** Consentement patient absent (`StaffPatientConsent`, adoption et création de RDV / patient par un professionnel). */
export function isPatientBookingConsentRequired(status: HttpStatus, code: ErrorCode): boolean {
  return status === 400 && code === 'PATIENT_BOOKING_CONSENT_REQUIRED';
}

const PATIENT_BOOKING_CONSENT_MESSAGE = 'Confirmez d’abord le consentement du patient pour la prise de rendez-vous.';

/** Rattachement d'un dossier trouvé par recherche (`POST /patients/adopt`). */
export const patientAdoptErrorMessage: ApiErrorMessageResolver = (status, code) => {
  if (isPatientBookingConsentRequired(status, code)) return PATIENT_BOOKING_CONSENT_MESSAGE;
  if (status === 403 && code === 'PATIENT_LOOKUP_MISMATCH') {
    return 'Ce dossier ne correspond plus au contact saisi. Vérifiez l’e-mail ou le téléphone du patient.';
  }
  if (status === 403) return 'Vous ne pouvez pas utiliser ce dossier patient.';
  return null;
};

/** E-mail déjà porté par un dossier patient (`POST /patients` renvoie aussi `existing_patient_id`). */
export function isEmailAlreadyUsedError(status: HttpStatus, code: ErrorCode): boolean {
  return status === 409 && code === 'EMAIL_ALREADY_USED';
}

/** Création d'un dossier patient par un professionnel (`POST /patients`). */
export const patientCreateErrorMessage: ApiErrorMessageResolver = (status, code) => {
  if (isEmailAlreadyUsedError(status, code)) {
    return 'Un patient existe déjà avec cet e-mail. Utilisez son dossier ou modifiez l’e-mail.';
  }
  if (isPatientBookingConsentRequired(status, code)) return PATIENT_BOOKING_CONSENT_MESSAGE;
  return null;
};

/** Création de rendez-vous (`POST /appointments`, brouillon patient, confirmation Cary). */
export const appointmentCreateErrorMessage: ApiErrorMessageResolver = (status, code) => {
  if (status === 403 && code === 'PATIENT_ACCESS_DENIED') {
    return 'Vous n’avez pas accès au dossier de ce patient. Retrouvez-le depuis vos patients ou par son e-mail ou son téléphone.';
  }
  if (status === 403 && code === 'ASSIGNMENT_FORBIDDEN') {
    return 'Ce professionnel ne peut pas être attribué à ce rendez-vous. Choisissez-en un autre ou laissez la demande partir en attente.';
  }
  if (status === 429 && code === 'NURSE_INVITE_RATE_LIMITED') {
    return 'Trop d’invitations SMS envoyées aujourd’hui. Réessayez demain ou choisissez un infirmier dans la liste.';
  }
  if (isPatientBookingConsentRequired(status, code)) return PATIENT_BOOKING_CONSENT_MESSAGE;
  return null;
};

/** RDV confié par SMS à un infirmier hors Cary : seul le numéro d'invitation est validé en plus (`AppointmentCreateInputPolicy::applyExternalNurseInvite`). */
export const nurseInviteAppointmentErrorMessage: ApiErrorMessageResolver = (status, code) => {
  if (status === 400 && code === 'VALIDATION_ERROR') {
    return 'Le numéro de l’infirmier(ère) doit être un mobile français : 06 ou 07, ou +33 6 / +33 7.';
  }
  return appointmentCreateErrorMessage(status, code);
};

/** Résolveur adapté au corps envoyé à `POST /appointments`. */
export function appointmentCreateErrorResolver(payload: object): ApiErrorMessageResolver {
  return 'external_nurse_invite' in payload && payload.external_nurse_invite
    ? nurseInviteAppointmentErrorMessage
    : appointmentCreateErrorMessage;
}

/** Réassignation d'une prise de sang par un laboratoire ou un sous-compte (`POST /appointments/{id}/reassign`). */
export const appointmentReassignErrorMessage: ApiErrorMessageResolver = (status, code) => {
  if (status === 403 && code === 'NOT_ASSIGNED_TO_TEAM') {
    return 'Ce rendez-vous n’est pas attribué à votre laboratoire : acceptez d’abord l’offre.';
  }
  if (status === 403) return 'Ce préleveur ne fait pas partie de votre laboratoire. Actualisez la liste et choisissez-en un autre.';
  if (status === 404) return 'Ce rendez-vous n’existe plus.';
  return null;
};

/** Enregistrement d'une zone de couverture (`POST` / `PUT /coverage-zones`). PLAN_LIMIT garde le rayon renvoyé par le serveur. */
export const coverageZoneSaveErrorMessage: ApiErrorMessageResolver = (status, code) => {
  if (status === 403 && code === 'FORBIDDEN') {
    return 'Vous ne pouvez modifier que votre zone ou celle d’un compte de votre laboratoire.';
  }
  return null;
};

/** Brouillon déjà transformé en rendez-vous ou expiré : il ne doit plus être proposé. */
export function isAiDraftClosedError(code: ErrorCode): boolean {
  return code === 'DRAFT_ALREADY_CONFIRMED' || code === 'DRAFT_EXPIRED';
}

/** Brouillons de rendez-vous Cary (`/ai/booking/drafts`, création, modification, confirmation). */
export const aiBookingDraftErrorMessage: ApiErrorMessageResolver = (status, code) => {
  const createRefusal = appointmentCreateErrorMessage(status, code);
  if (createRefusal) return createRefusal;
  if (status === 403) return 'La prise de rendez-vous avec Cary n’est pas disponible pour votre profil.';
  if (status === 404) return 'Ce récapitulatif n’existe plus. Demandez à Cary de le préparer à nouveau.';
  switch (code) {
    case 'DRAFT_NOT_READY':
      return 'Le récapitulatif est incomplet. Terminez-le avec Cary avant de valider.';
    case 'DRAFT_EXPIRED':
      return 'Ce récapitulatif a expiré. Demandez à Cary de le préparer à nouveau.';
    case 'DRAFT_ALREADY_CONFIRMED':
      return 'Ce rendez-vous a déjà été confirmé. Retrouvez-le dans vos rendez-vous.';
    case 'EMAIL_ALREADY_USED':
      return 'Cet e-mail est déjà utilisé par un autre compte. Indiquez un autre e-mail pour le patient.';
    default:
      return null;
  }
};

/** L'avis a déjà une réponse : la liste affichée est périmée. */
export function isReviewResponseConflict(status: HttpStatus, code: ErrorCode): boolean {
  return status === 409 && code === 'RESPONSE_ALREADY_EXISTS';
}

/** Réponse à un avis reçu (`PUT /reviews/{id}/response`). */
export const reviewResponseErrorMessage: ApiErrorMessageResolver = (status, code) => {
  if (isReviewResponseConflict(status, code)) return 'Vous avez déjà répondu à cet avis.';
  if (code === 'VALIDATION_ERROR') {
    return `Votre réponse doit contenir entre 1 et ${REVIEW_RESPONSE_MAX_LENGTH} caractères.`;
  }
  if (status === 403) return 'Vous ne pouvez pas répondre à cet avis.';
  if (status === 404) return 'Cet avis n’existe plus.';
  return null;
};
