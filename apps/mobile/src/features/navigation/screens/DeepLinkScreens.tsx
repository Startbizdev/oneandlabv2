import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore, isMobileRole } from '@/store/auth-store';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { useToast } from '@/providers/ToastProvider';
import { resolveQrToken } from '../api/qr.service';
import { DeepLinkLoadingView } from '../components/DeepLinkLoadingView';
import { useQrLinkDispatch } from '../hooks/use-qr-link-dispatch';
import { pharmacyLinkHref, qrLinkHref, usePendingDeepLinkStore } from '../store/pending-deep-link-store';
import { parseQrRedirectUrl } from '../utils/qr-link';

/**
 * `https://cary.bio/qr/{token}` : sans session, le lien est mémorisé (connexion puis relance) ;
 * connecté, le QR est résolu (scan enregistré) puis aiguillé vers la commande pharmacie ou la prise de RDV.
 */
export function QrLinkScreen({ token }: { token: string }) {
  const router = useRouter();
  const { show: toast } = useToast();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const sessionToken = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const dispatch = useQrLinkDispatch();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isHydrated || startedRef.current) return;
    const qrToken = token.trim();
    if (!sessionToken) {
      // `useAuthGuard` ouvre la connexion ; on relancera ce lien ensuite.
      if (qrToken) usePendingDeepLinkStore.getState().remember(qrLinkHref(qrToken));
      return;
    }
    if (!role || !isMobileRole(role)) return;
    startedRef.current = true;

    void (async () => {
      if (!qrToken) {
        router.replace(getRoleHome(role));
        toast('Ce QR code n’est pas reconnu.', { type: 'error' });
        return;
      }
      try {
        const res = await resolveQrToken(qrToken);
        await dispatch(parseQrRedirectUrl(res.redirect_url, qrToken), role, userId);
      } catch (error) {
        if (__DEV__) console.warn('[qr-link] résolution impossible', error);
        router.replace(getRoleHome(role));
        toast('QR code introuvable', { message: 'Ce code n’est plus actif ou n’existe pas.', type: 'error' });
      }
    })();
  }, [dispatch, isHydrated, role, router, sessionToken, toast, token, userId]);

  return <DeepLinkLoadingView label="Ouverture du QR code…" />;
}

/** `https://cary.bio/pharmacie/{id}` : même parcours, la pharmacie est déjà connue. */
export function PharmacyLinkScreen({ pharmacyId, utmQr }: { pharmacyId: string; utmQr: string | null }) {
  const router = useRouter();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const sessionToken = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const dispatch = useQrLinkDispatch();
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isHydrated || startedRef.current) return;
    const id = pharmacyId.trim();
    if (!sessionToken) {
      if (id) usePendingDeepLinkStore.getState().remember(pharmacyLinkHref(id, utmQr));
      return;
    }
    if (!role || !isMobileRole(role)) return;
    startedRef.current = true;
    if (!id) {
      router.replace(getRoleHome(role));
      return;
    }
    void dispatch({ kind: 'pharmacy', pharmacyId: id, utmQr }, role, userId);
  }, [dispatch, isHydrated, pharmacyId, role, router, sessionToken, userId, utmQr]);

  return <DeepLinkLoadingView label="Ouverture de la pharmacie…" />;
}
