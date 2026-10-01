import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  ErrorCode,
  requestPurchase,
  useIAP,
  type Product,
  type Purchase,
} from 'expo-iap';
import { PATIENT_VIP_FEE_LABEL, PATIENT_VIP_IAP_PRODUCT_ID } from '@oneandlab/shared-constants';
import { completePatientBookingDraftIap } from '@/features/appointments/api/booking-draft.service';
import { logVipPaymentIssue, VipPaymentError } from '../utils/vip-payment-error';

async function verifyVipPurchaseOnServer(draftId: string, purchase: Purchase): Promise<string[]> {
  if (Platform.OS === 'ios') {
    const res = await completePatientBookingDraftIap({
      draft_id: draftId,
      platform: 'ios',
      transactionId: purchase.transactionId ?? undefined,
      signedTransaction: purchase.purchaseToken ?? undefined,
    });
    if (!res.success || !res.data?.appointment_ids?.length) {
      throw new Error(res.error ?? 'Finalisation IAP échouée');
    }
    return res.data.appointment_ids.map(String);
  }

  if (Platform.OS === 'android') {
    const token = purchase.purchaseToken;
    if (!token) throw new Error('Token Google Play manquant');
    const res = await completePatientBookingDraftIap({
      draft_id: draftId,
      platform: 'android',
      productId: purchase.productId ?? PATIENT_VIP_IAP_PRODUCT_ID,
      purchaseToken: token,
    });
    if (!res.success || !res.data?.appointment_ids?.length) {
      throw new Error(res.error ?? 'Finalisation IAP échouée');
    }
    return res.data.appointment_ids.map(String);
  }

  throw new Error('IAP disponible uniquement sur iOS et Android');
}

function isUserCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === ErrorCode.UserCancelled
  );
}

/** Les erreurs rejetées sont des `VipPaymentError` : message patient, détail technique journalisé. */
export function usePatientVipIap() {
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);
  const pendingDraftRef = useRef<string | null>(null);
  const resolveRef = useRef<((ids: string[]) => void) | null>(null);
  const rejectRef = useRef<((err: VipPaymentError) => void) | null>(null);
  const finishRef = useRef<((purchase: Purchase) => Promise<void>) | null>(null);

  const settle = useCallback((outcome: { ids: string[] } | { error: VipPaymentError }) => {
    if ('ids' in outcome) resolveRef.current?.(outcome.ids);
    else rejectRef.current?.(outcome.error);
    resolveRef.current = null;
    rejectRef.current = null;
  }, []);

  const { connected, products, fetchProducts, finishTransaction } = useIAP({
    onPurchaseSuccess: async (purchase) => {
      const draftId = pendingDraftRef.current;
      if (!draftId) {
        setPurchaseLoading(false);
        return;
      }
      setPurchaseLoading(true);
      try {
        const ids = await verifyVipPurchaseOnServer(draftId, purchase);
        await finishRef.current?.(purchase);
        pendingDraftRef.current = null;
        settle({ ids });
      } catch (error) {
        logVipPaymentIssue(`server verification failed for draft ${draftId}`, error);
        settle({ error: new VipPaymentError('not_finalized', error) });
      } finally {
        setPurchaseLoading(false);
      }
    },
    onPurchaseError: (error) => {
      setPurchaseLoading(false);
      pendingDraftRef.current = null;
      if (error.code === ErrorCode.UserCancelled) {
        settle({ error: new VipPaymentError('cancelled', error) });
        return;
      }
      logVipPaymentIssue(`purchase error ${error.code}`, error);
      const kind = error.code === ErrorCode.EmptySkuList ? 'unavailable' : 'failed';
      settle({ error: new VipPaymentError(kind, error) });
    },
  });

  finishRef.current = async (purchase) => {
    await finishTransaction({ purchase, isConsumable: true });
  };

  const loadStoreProduct = useCallback(async () => {
    if (!connected) return;
    setStoreLoading(true);
    try {
      await fetchProducts({ skus: [PATIENT_VIP_IAP_PRODUCT_ID], type: 'inapp' });
    } catch (error) {
      logVipPaymentIssue('fetchProducts failed', error);
    } finally {
      setStoreLoading(false);
    }
  }, [connected, fetchProducts]);

  useEffect(() => {
    if (!connected) return;
    void loadStoreProduct();
  }, [connected, loadStoreProduct]);

  const storeProduct = useMemo(
    () => products.find((item) => item.id === PATIENT_VIP_IAP_PRODUCT_ID) as Product | undefined,
    [products],
  );

  const localizedVipPrice = storeProduct?.displayPrice ?? PATIENT_VIP_FEE_LABEL;

  const purchaseVipForDraft = useCallback(
    (draftId: string): Promise<string[]> => {
      if (!connected) {
        logVipPaymentIssue('store not connected', { draftId });
        return Promise.reject(new VipPaymentError('unavailable'));
      }
      if (!storeProduct) {
        logVipPaymentIssue(`product ${PATIENT_VIP_IAP_PRODUCT_ID} not returned by the store`, { draftId });
        return Promise.reject(new VipPaymentError('unavailable'));
      }

      return new Promise<string[]>((resolve, reject) => {
        pendingDraftRef.current = draftId;
        resolveRef.current = resolve;
        rejectRef.current = reject;
        setPurchaseLoading(true);
        const sku = PATIENT_VIP_IAP_PRODUCT_ID;
        void requestPurchase({
          type: 'in-app',
          request: {
            apple: { sku },
            ios: { sku },
            google: { skus: [sku] },
          },
        }).catch((error: unknown) => {
          setPurchaseLoading(false);
          pendingDraftRef.current = null;
          if (isUserCancelled(error)) {
            settle({ error: new VipPaymentError('cancelled', error) });
            return;
          }
          logVipPaymentIssue('requestPurchase failed', error);
          settle({ error: new VipPaymentError('failed', error) });
        });
      });
    },
    [connected, storeProduct, settle],
  );

  return {
    connected,
    storeLoading,
    localizedVipPrice,
    purchaseVipForDraft,
    purchaseLoading,
    productId: PATIENT_VIP_IAP_PRODUCT_ID,
  };
}
