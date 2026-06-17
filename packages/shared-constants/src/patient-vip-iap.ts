/** Produit IAP consommable — supplément Horaire VIP prise de sang (mobile). */
export const PATIENT_VIP_IAP_PRODUCT_ID = 'cary.patient.blood.vip' as const;

/** Montant TTC affiché (centimes) — aligné web Stripe / PatientUrgencyConfig. */
export const PATIENT_VIP_AMOUNT_CENTS = 1499;

export const PATIENT_VIP_FEE_LABEL = '14,99 € TTC';

/** Créneau VIP : heures autorisées (inclus). */
export const PATIENT_VIP_MIN_HOUR = 6;
export const PATIENT_VIP_MAX_HOUR = 19;

export const PATIENT_VIP_MINUTE_STEPS = [0, 15, 30, 45] as const;
