import type { NursePlanDefinition } from '@oneandlab/shared-constants';

/** Affichage tarif Cary — toujours en euros (référence produit), jamais le prix localisé boutique ($). */
export function getSubscriptionPriceParts(
  plan: Pick<NursePlanDefinition, 'priceLabel' | 'priceSuffix'>,
): { amount: string; suffix: string } {
  return {
    amount: plan.priceLabel.trim(),
    suffix: plan.priceSuffix.trim() || '/mois',
  };
}

export const NURSE_PRO_TRIAL_FOOTNOTE =
  '30 jours d’essai pour un premier abonnement éligible, puis 29 €/mois. Résiliable à tout moment.';
