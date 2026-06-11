import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorCode, getAvailablePurchases, useIAP, type Purchase } from 'expo-iap';
import { NURSE_IAP_PRODUCT_ID } from '@oneandlab/shared-constants';
import {
  fetchNurseIapSubscription,
  verifyApplePurchase,
  verifyGooglePurchase,
  type NurseIapSubscription,
} from '@/features/nurse/api/iap.service';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';

async function verifyPurchaseOnServer(purchase: Purchase): Promise<NurseIapSubscription> {
  if (Platform.OS === 'ios') {
    const res = await verifyApplePurchase({
      transactionId: purchase.transactionId ?? undefined,
      signedTransaction: purchase.purchaseToken ?? undefined,
    });
    if (!res.data) {
      throw new Error(res.error ?? 'Validation serveur échouée');
    }
    return res.data;
  }

  if (Platform.OS === 'android') {
    const token = purchase.purchaseToken;
    if (!token) {
      throw new Error('Token Google Play manquant');
    }
    const res = await verifyGooglePurchase({
      productId: purchase.productId,
      purchaseToken: token,
    });
    if (!res.data) {
      throw new Error(res.error ?? 'Validation serveur échouée');
    }
    return res.data;
  }

  throw new Error('IAP disponible uniquement sur iOS et Android');
}

export function useNurseIap() {
  const qc = useQueryClient();
  const { show: toast } = useToast();
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const finishRef = useRef<((purchase: Purchase) => Promise<void>) | null>(null);

  const subscriptionQ = useQuery({
    queryKey: queryKeys.iap.subscription,
    queryFn: async () => {
      const res = await fetchNurseIapSubscription();
      return res.data ?? null;
    },
  });

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    restorePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      setPurchaseLoading(true);
      try {
        await verifyPurchaseOnServer(purchase);
        await finishRef.current?.(purchase);
        await qc.invalidateQueries({ queryKey: queryKeys.iap.subscription });
        await qc.invalidateQueries({ queryKey: queryKeys.planLimits.current });
        toast('Abonnement Cary Pro activé', { type: 'success' });
      } catch (error) {
        handleApiError(error, toast, 'iap-verify');
      } finally {
        setPurchaseLoading(false);
      }
    },
    onPurchaseError: (error) => {
      setPurchaseLoading(false);
      if (error.code === ErrorCode.UserCancelled) {
        return;
      }
      toast(error.message || 'Achat impossible', { type: 'error' });
    },
  });

  finishRef.current = async (purchase: Purchase) => {
    await finishTransaction({ purchase, isConsumable: false });
  };

  useEffect(() => {
    if (!connected) {
      return;
    }
    void fetchProducts({ skus: [NURSE_IAP_PRODUCT_ID], type: 'subs' });
  }, [connected, fetchProducts]);

  const storeProduct = useMemo(
    () => subscriptions.find((item) => item.id === NURSE_IAP_PRODUCT_ID),
    [subscriptions],
  );

  const localizedProPrice = storeProduct?.displayPrice ?? null;

  const purchasePro = useCallback(async () => {
    if (!connected) {
      toast('Boutique indisponible, réessayez dans un instant', { type: 'error' });
      return;
    }
    if (subscriptionQ.data?.can_purchase_store === false) {
      toast('Vous avez déjà Cary Pro via le site web. Gérez votre abonnement sur cary.bio.', {
        type: 'info',
      });
      return;
    }
    setPurchaseLoading(true);
    try {
      await requestPurchase({
        type: 'subs',
        request: {
          apple: { sku: NURSE_IAP_PRODUCT_ID },
          google: { skus: [NURSE_IAP_PRODUCT_ID] },
        },
      });
    } catch (error) {
      setPurchaseLoading(false);
      handleApiError(error, toast, 'iap-purchase');
    }
  }, [connected, requestPurchase, subscriptionQ.data?.can_purchase_store, toast]);

  const restore = useCallback(async () => {
    if (!connected) {
      toast('Boutique indisponible', { type: 'error' });
      return;
    }
    setRestoreLoading(true);
    try {
      await restorePurchases();
      const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      let verified = false;
      for (const purchase of purchases) {
        if (purchase.productId !== NURSE_IAP_PRODUCT_ID) {
          continue;
        }
        try {
          await verifyPurchaseOnServer(purchase);
          await finishTransaction({ purchase, isConsumable: false });
          verified = true;
        } catch (error) {
          handleApiError(error, toast, 'iap-restore-verify');
        }
      }
      await qc.invalidateQueries({ queryKey: queryKeys.iap.subscription });
      await qc.invalidateQueries({ queryKey: queryKeys.planLimits.current });
      toast(
        verified ? 'Abonnement restauré' : 'Aucun abonnement Cary Pro à restaurer',
        { type: verified ? 'success' : 'info' },
      );
    } catch (error) {
      handleApiError(error, toast, 'iap-restore');
    } finally {
      setRestoreLoading(false);
    }
  }, [connected, finishTransaction, qc, restorePurchases, toast]);

  return {
    connected,
    subscription: subscriptionQ.data,
    subscriptionLoading: subscriptionQ.isLoading,
    refetchSubscription: subscriptionQ.refetch,
    localizedProPrice,
    purchasePro,
    purchaseLoading,
    restore,
    restoreLoading,
    productId: NURSE_IAP_PRODUCT_ID,
  };
}
