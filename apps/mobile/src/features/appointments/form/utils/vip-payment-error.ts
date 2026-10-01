/**
 * - `cancelled` : l'utilisateur a fermé la feuille du store.
 * - `unavailable` : boutique ou produit indisponible, rien n'a été payé.
 * - `failed` : le store a refusé ou interrompu l'achat.
 * - `not_finalized` : le store a encaissé mais le serveur n'a pas validé la réservation.
 */
export type VipPaymentErrorKind = 'cancelled' | 'unavailable' | 'failed' | 'not_finalized';

const USER_MESSAGES: Record<VipPaymentErrorKind, string> = {
  cancelled: 'Paiement annulé.',
  unavailable:
    'Le paiement prioritaire est momentanément indisponible. Réessayez dans un instant ou choisissez un autre type de créneau.',
  failed: 'Le paiement n’a pas abouti. Vous pouvez réessayer.',
  not_finalized:
    'Le paiement a été effectué mais la réservation n’a pas pu être finalisée. Contactez le support avant de réessayer, pour ne pas payer deux fois.',
};

/** Erreur de paiement « Prioritaire » : `message` est destiné au patient, `detail` garde l'erreur technique. */
export class VipPaymentError extends Error {
  readonly kind: VipPaymentErrorKind;
  readonly detail: unknown;

  constructor(kind: VipPaymentErrorKind, detail?: unknown) {
    super(USER_MESSAGES[kind]);
    this.name = 'VipPaymentError';
    this.kind = kind;
    this.detail = detail;
  }
}

export function logVipPaymentIssue(context: string, detail: unknown): void {
  console.warn(`[patient-vip-iap] ${context}`, detail);
}
