import type { AndroidSubscriptionOfferInput, ProductSubscription, ProductSubscriptionAndroid } from 'expo-iap';
import { NURSE_IAP_PRODUCT_ID } from '@oneandlab/shared-constants';

export const IAP_PRODUCT_ID = NURSE_IAP_PRODUCT_ID;

export function findStoreProduct(
  items: ProductSubscription[] | undefined,
  productId: string = IAP_PRODUCT_ID,
): ProductSubscription | undefined {
  return items?.find((item) => item.id === productId);
}

export function resolveAndroidSubscriptionOffers(
  product: ProductSubscription | undefined,
  productId: string = IAP_PRODUCT_ID,
): AndroidSubscriptionOfferInput[] | null {
  if (!product) {
    return null;
  }

  for (const offer of product.subscriptionOffers ?? []) {
    const offerToken = offer.offerTokenAndroid?.trim();
    if (offerToken) {
      return [{ sku: productId, offerToken }];
    }
  }

  const legacyOffers = (product as ProductSubscriptionAndroid).subscriptionOfferDetailsAndroid;
  const legacyToken = legacyOffers?.[0]?.offerToken?.trim();
  if (legacyToken) {
    return [{ sku: productId, offerToken: legacyToken }];
  }

  return null;
}

export type IapPurchaseRequest = {
  type: 'subs';
  request: {
    apple: { sku: string };
    ios?: { sku: string };
    google: {
      skus: string[];
      subscriptionOffers?: AndroidSubscriptionOfferInput[];
    };
  };
};

export function buildSubscriptionPurchaseRequest(
  product: ProductSubscription | undefined,
  productId: string = IAP_PRODUCT_ID,
  platform: 'ios' | 'android' = 'ios',
): { ok: true; request: IapPurchaseRequest } | { ok: false; reason: string } {
  if (!product) {
    return {
      ok: false,
      reason: `Produit « ${productId} » introuvable dans la boutique.`,
    };
  }

  const androidOffers = resolveAndroidSubscriptionOffers(product, productId);
  if (platform === 'android' && !androidOffers?.length) {
    return {
      ok: false,
      reason: 'Offre d’abonnement Google Play indisponible (offerToken manquant).',
    };
  }

  return {
    ok: true,
    request: {
      type: 'subs',
      request: {
        apple: { sku: productId },
        ios: { sku: productId },
        google: {
          skus: [productId],
          subscriptionOffers: androidOffers ?? undefined,
        },
      },
    },
  };
}
