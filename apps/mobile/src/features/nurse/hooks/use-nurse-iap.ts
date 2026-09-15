import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ErrorCode,
  getAvailablePurchases,
  useIAP,
  type Purchase,
} from 'expo-iap';
import { NURSE_IAP_PRODUCT_ID } from '@oneandlab/shared-constants';
import {
  fetchNurseIapSubscription,
  verifyApplePurchase,
  verifyGooglePurchase,
  type NurseIapSubscription,
} from '@/features/nurse/api/iap.service';
import {
  buildSubscriptionPurchaseRequest,
} from '@/features/nurse/lib/iap-purchase';
import { loadStoreProductFromStore, requestSubscriptionPurchase } from '@/features/nurse/lib/iap-store';
import { queryKeys } from '@/lib/query-keys';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';

async function verifyPurchaseOnServer(purchase: Purchase): Promise<NurseIapSubscription> {
  if (Platform.OS === 'ios') {
    const res = await verifyApplePurchase({
      transactionId: purchase.transactionId ?? undefined,
      signedTransaction: purchase.purchaseToken ?? undefined,
    });
    if (!res.success || !res.data) {
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
    if (!res.success || !res.data) {
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
  const [storeLoading, setStoreLoading] = useState(false);
  const finishRef = useRef<((purchase: Purchase) => Promise<void>) | null>(null);

  const subscriptionQ = useQuery({
    queryKey: queryKeys.iap.subscription,
    queryFn: async () => {
      const res = await fetchNurseIapSubscription();
      if (!res.success || !res.data) throw new Error('Impossible de vérifier votre abonnement. Réessayez.');
      return res.data;
    },
  });

  const {
    connected,
    subscriptions,
    fetchProducts,
    finishTransaction,
    restorePurchases,
  } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      setPurchaseLoading(true);
      try {
        const verified = await verifyPurchaseOnServer(purchase);
        await finishRef.current?.(purchase);
        await qc.invalidateQueries({ queryKey: queryKeys.iap.subscription });
        await qc.invalidateQueries({ queryKey: queryKeys.planLimits.current });
        toast(verified.plan_slug === 'nurse_pro' ? 'Abonnement Cary Pro activé' : 'Achat vérifié. Aucun abonnement Pro actif pour cet achat.', { type: verified.plan_slug === 'nurse_pro' ? 'success' : 'info' });
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
      let message = error.message || 'Achat impossible';
      if (error.code === ErrorCode.EmptySkuList) {
        message = 'Cette offre est temporairement indisponible dans la boutique. Réessayez plus tard.';
      }
      toast(message, { type: 'error' });
    },
  });

  finishRef.current = async (purchase: Purchase) => {
    await finishTransaction({ purchase, isConsumable: false });
  };

  const loadStoreProduct = useCallback(async () => {
    if (!connected) {
      return;
    }
    setStoreLoading(true);
    try {
      await fetchProducts({ skus: [NURSE_IAP_PRODUCT_ID], type: 'subs' });
    } catch (error) {
      handleApiError(error, toast, 'iap-products');
    } finally {
      setStoreLoading(false);
    }
  }, [connected, fetchProducts, toast]);

  useEffect(() => {
    if (!connected) {
      return;
    }
    void loadStoreProduct();
  }, [connected, loadStoreProduct]);

  const storeProduct = useMemo(
    () => subscriptions.find((item) => item.id === NURSE_IAP_PRODUCT_ID),
    [subscriptions],
  );

  const localizedProPrice = storeProduct?.displayPrice ?? null;

  const purchasePro = useCallback(async () => {
    if (purchaseLoading || restoreLoading) return;
    if (subscriptionQ.isError || subscriptionQ.isFetching || !subscriptionQ.data) {
      toast('Vérifiez votre abonnement avant de souscrire. Réessayez le chargement.', { type: 'error' });
      return;
    }
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

    let product = storeProduct;
    if (!product) {
      setStoreLoading(true);
      try {
        product = await loadStoreProductFromStore(NURSE_IAP_PRODUCT_ID);
      } catch (error) {
        handleApiError(error, toast, 'iap-products');
        return;
      } finally {
        setStoreLoading(false);
      }
    }

    if (!product) {
      toast(
        'Cette offre est temporairement indisponible dans la boutique. Réessayez plus tard.',
        { type: 'error' },
      );
      return;
    }

    const purchaseRequest = buildSubscriptionPurchaseRequest(
      product,
      NURSE_IAP_PRODUCT_ID,
      Platform.OS === 'android' ? 'android' : 'ios',
    );
    if (!purchaseRequest.ok) {
      toast(purchaseRequest.reason, { type: 'error' });
      return;
    }

    setPurchaseLoading(true);
    try {
      await requestSubscriptionPurchase(purchaseRequest.request);
    } catch (error) {
      setPurchaseLoading(false);
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === ErrorCode.UserCancelled
      ) {
        return;
      }
      handleApiError(error, toast, 'iap-purchase');
    }
  }, [
    connected,
    purchaseLoading,
    restoreLoading,
    storeProduct,
    subscriptionQ.data,
    subscriptionQ.isError,
    subscriptionQ.isFetching,
    toast,
  ]);

  const restore = useCallback(async () => {
    if (restoreLoading || purchaseLoading) return;
    if (!connected) {
      toast('Boutique indisponible', { type: 'error' });
      return;
    }
    setRestoreLoading(true);
    try {
      await restorePurchases();
      const purchases = await getAvailablePurchases({ onlyIncludeActiveItemsIOS: true });
      let verified = false;
      let verificationFailed = false;
      for (const purchase of purchases) {
        if (purchase.productId !== NURSE_IAP_PRODUCT_ID) {
          continue;
        }
        try {
          const subscription = await verifyPurchaseOnServer(purchase);
          await finishTransaction({ purchase, isConsumable: false });
          verified = verified || subscription.plan_slug === 'nurse_pro';
        } catch (error) {
          verificationFailed = true;
          handleApiError(error, toast, 'iap-restore-verify');
        }
      }
      await qc.invalidateQueries({ queryKey: queryKeys.iap.subscription });
      await qc.invalidateQueries({ queryKey: queryKeys.planLimits.current });
      if (!verified && verificationFailed) return;
      toast(
        verified ? 'Abonnement restauré' : 'Aucun abonnement Cary Pro à restaurer',
        { type: verified ? 'success' : 'info' },
      );
    } catch (error) {
      handleApiError(error, toast, 'iap-restore');
    } finally {
      setRestoreLoading(false);
    }
  }, [connected, finishTransaction, qc, restorePurchases, toast, restoreLoading, purchaseLoading]);

  return {
    connected,
    storeLoading,
    subscription: subscriptionQ.data,
    subscriptionLoading: subscriptionQ.isFetching,
    subscriptionError: subscriptionQ.isError,
    refetchSubscription: subscriptionQ.refetch,
    localizedProPrice,
    purchasePro,
    purchaseLoading,
    restore,
    restoreLoading,
    productId: NURSE_IAP_PRODUCT_ID,
  };
}
