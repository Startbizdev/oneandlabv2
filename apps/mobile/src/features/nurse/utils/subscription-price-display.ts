import type { NursePlanDefinition } from '@oneandlab/shared-constants';

/**
 * Tarif affiché sur une offre. Le prix boutique (`displayPrice`, devise du compte App Store / Google Play)
 * prime dès qu'il est chargé : c'est le montant réellement débité. Sinon tarif de référence Cary en euros.
 */
export function getSubscriptionPriceParts(
  plan: Pick<NursePlanDefinition, 'priceLabel' | 'priceSuffix'>,
  storePrice?: string | null,
): { amount: string; suffix: string } {
  return {
    amount: storePrice?.trim() || plan.priceLabel.trim(),
    suffix: plan.priceSuffix.trim() || '/mois',
  };
}

export function nurseProTrialFootnote(
  plan: Pick<NursePlanDefinition, 'priceLabel' | 'priceSuffix'>,
  storePrice?: string | null,
): string {
  const { amount, suffix } = getSubscriptionPriceParts(plan, storePrice);
  return `30 jours d’essai pour un premier abonnement éligible, puis ${amount}${suffix}. Résiliable à tout moment.`;
}
