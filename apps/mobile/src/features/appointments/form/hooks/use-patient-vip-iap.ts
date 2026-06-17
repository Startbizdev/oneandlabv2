import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  ErrorCode,
  isUserCancelledError,
  requestPurchase,
  useIAP,
  type Product,
  type Purchase,
} from 'expo-iap';
import { PATIENT_VIP_FEE_LABEL, PATIENT_VIP_IAP_PRODUCT_ID } from '@oneandlab/shared-constants';
import { completePatientBookingDraftIap } from '@/features/appointments/api/booking-draft.service';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useToast } from '@/providers/ToastProvider';

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

export function usePatientVipIap() {
  const { show: toast } = useToast();
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);
  const pendingDraftRef = useRef<string | null>(null);
  const resolveRef = useRef<((ids: string[]) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);
  const finishRef = useRef<((purchase: Purchase) => Promise<void>) | null>(null);

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
        resolveRef.current?.(ids);
        resolveRef.current = null;
        rejectRef.current = null;
        toast('Horaire VIP confirmé', { type: 'success' });
      } catch (error) {
        rejectRef.current?.(error instanceof Error ? error : new Error(String(error)));
        rejectRef.current = null;
        resolveRef.current = null;
        handleApiError(error, toast, 'patient-vip-iap');
      } finally {
        setPurchaseLoading(false);
      }
    },
    onPurchaseError: (error) => {
      setPurchaseLoading(false);
      pendingDraftRef.current = null;
      if (error.code === ErrorCode.UserCancelled) {
        rejectRef.current?.(new Error('USER_CANCELLED'));
        rejectRef.current = null;
        resolveRef.current = null;
        return;
      }
      let message = error.message || 'Achat impossible';
      if (error.code === ErrorCode.EmptySkuList) {
        message =
          Platform.OS === 'ios'
            ? `Produit App Store introuvable. Vérifiez que ${PATIENT_VIP_IAP_PRODUCT_ID} est actif (consommable) dans App Store Connect.`
            : `Produit Google Play introuvable. Vérifiez ${PATIENT_VIP_IAP_PRODUCT_ID} (achat unique).`;
      }
      const err = new Error(message);
      rejectRef.current?.(err);
      rejectRef.current = null;
      resolveRef.current = null;
      toast(message, { type: 'error' });
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
        toast('Boutique indisponible, réessayez dans un instant', { type: 'error' });
        return Promise.reject(new Error('Boutique indisponible'));
      }
      if (!storeProduct) {
        toast(
          `Produit « ${PATIENT_VIP_IAP_PRODUCT_ID} » introuvable. Testez avec un build natif EAS (pas Expo Go).`,
          { type: 'error' },
        );
        return Promise.reject(new Error('Produit introuvable'));
      }

      return new Promise<string[]>((resolve, reject) => {
        pendingDraftRef.current = draftId;
        resolveRef.current = resolve;
        rejectRef.current = reject;
        setPurchaseLoading(true);
        const sku = PATIENT_VIP_IAP_PRODUCT_ID;
        void requestPurchase({
          type: 'inapp',
          request: {
            apple: { sku },
            ios: { sku },
            google: { skus: [sku] },
          },
        }).catch((error) => {
          setPurchaseLoading(false);
          pendingDraftRef.current = null;
          if (isUserCancelledError(error)) {
            reject(new Error('USER_CANCELLED'));
            return;
          }
          handleApiError(error, toast, 'patient-vip-purchase');
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      });
    },
    [connected, storeProduct, toast],
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
