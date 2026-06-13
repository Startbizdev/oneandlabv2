import { NURSE_PLANS } from '@oneandlab/shared-constants';
import type { ProductSubscription } from 'expo-iap';

export type NurseProPriceDisplay = {
  price: string;
  /** Présent si la boutique Apple/Google n’est pas en EUR (ex. compte App Store Émirats). */
  priceNote?: string;
};

/**
 * Tarif affiché sur la carte Pro : référence France (29 €) sauf boutique EUR,
 * où l’on reprend le libellé StoreKit (obligation cohérence facturation).
 */
export function resolveNurseProPriceDisplay(
  storeProduct: Pick<ProductSubscription, 'displayPrice' | 'currency'> | undefined,
): NurseProPriceDisplay {
  const reference = NURSE_PLANS.nurse_pro.priceLabel;
  const displayPrice = storeProduct?.displayPrice?.trim();
  if (!displayPrice) {
    return { price: reference };
  }

  const currency = storeProduct?.currency?.trim().toUpperCase();
  if (currency === 'EUR') {
    return { price: displayPrice };
  }

  return {
    price: reference,
    priceNote: `Montant débité sur votre compte App Store : ${displayPrice}${currency ? ` (${currency})` : ''}.`,
  };
}
