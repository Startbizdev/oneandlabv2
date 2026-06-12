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

  try {
    const native = requireNativeModule<{ requestPurchase: (params: unknown) => Promise<unknown> }>(
      'ExpoIap',
    );
    await native.requestPurchase({
      type: 'subs',
      request: {
        apple: { sku },
        ios: { sku },
      },
    });
  } catch {
    // Fallback si le module natif n'est pas résolu (ex. build atypique).
    await requestPurchase({
      type: 'subs',
      request: {
        apple: { sku },
        ios: { sku },
        google: payload.request.google,
      },
    });
  }
}
