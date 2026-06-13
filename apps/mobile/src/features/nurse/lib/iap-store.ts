import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import {
  fetchProducts as fetchStoreProducts,
  requestPurchase,
  syncIOS,
  type ProductSubscription,
} from 'expo-iap';
import { findStoreProduct, type IapPurchaseRequest } from '@/features/nurse/lib/iap-purchase';

export async function loadStoreProductFromStore(productId: string): Promise<ProductSubscription | undefined> {
  if (Platform.OS === 'ios') {
    try {
      await syncIOS();
    } catch {
      // Non bloquant — on tente quand même fetchProducts.
    }
  }

  const result = await fetchStoreProducts({ skus: [productId], type: 'subs' });
  return findStoreProduct((result ?? []) as ProductSubscription[], productId);
}

/**
 * Sur iOS, `expo-iap`/`requestPurchase` envoie `{ ios: { sku } }` au module natif.
 * OpenIAP décode `requestSubscription` via la clé `apple` → SKU vide → « SKU manquant ».
 */
export async function requestSubscriptionPurchase(payload: IapPurchaseRequest): Promise<void> {
  if (Platform.OS !== 'ios') {
    await requestPurchase(payload);
    return;
  }

  const sku = payload.request.apple.sku?.trim();
  if (!sku) {
    throw new Error('SKU Apple manquant');
  }

  const nativePurchasePayload = {
    type: 'subs' as const,
    request: {
      apple: { sku },
      ios: { sku },
    },
  };

  let native: { requestPurchase: (params: unknown) => Promise<unknown> } | null = null;
  try {
    native = requireNativeModule('ExpoIap');
  } catch {
    // Module absent (Expo Go, tests) — fallback JS expo-iap.
  }

  if (native) {
    // Ne jamais fallback sur erreur StoreKit (ex. annulation) : rejette la promesse
    // et le catch vide relançait un 2e requestPurchase → 2e sheet Apple.
    await native.requestPurchase(nativePurchasePayload);
    return;
  }

  await requestPurchase({
    type: 'subs',
    request: {
      apple: { sku },
      ios: { sku },
      google: payload.request.google,
    },
  });
}
