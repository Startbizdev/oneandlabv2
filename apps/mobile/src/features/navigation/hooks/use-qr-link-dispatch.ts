import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { canShowOrderTab } from '@oneandlab/shared-utils';
import type { MobileRole } from '@oneandlab/shared-constants';
import { getRoleHome } from '@/features/auth/hooks/use-auth-guard';
import { pharmacyModuleFlagsQueryOptions } from '@/features/pharmacy-orders/hooks/pharmacy-module-flags-query';
import { useToast } from '@/providers/ToastProvider';
import { dispatchQrLinkTarget, type QrLinkTarget } from '../utils/qr-link';

/**
 * Ouvre l'écran d'un lien QR pour l'utilisateur connecté. L'accueil du rôle est posé dessous
 * pour que « retour » depuis l'assistant ne ferme pas l'app (démarrage à froid sur le lien).
 */
export function useQrLinkDispatch() {
  const router = useRouter();
  const qc = useQueryClient();
  const { show: toast } = useToast();

  return useCallback(
    async (target: QrLinkTarget, role: MobileRole, userId: string) => {
      let canOrder = true;
      if (target.kind === 'pharmacy') {
        try {
          canOrder = canShowOrderTab(await qc.fetchQuery(pharmacyModuleFlagsQueryOptions(userId)));
        } catch (error) {
          // Droits illisibles : l'assistant affichera lui-même l'erreur serveur éventuelle.
          if (__DEV__) console.warn('[qr-link] droits pharmacie indisponibles', error);
        }
      }
      const home = getRoleHome(role);
      const { href, message } = dispatchQrLinkTarget(target, role, home, canOrder);
      router.replace(home);
      if (href !== home) router.push(href);
      if (message) toast(message, { type: 'info' });
    },
    [qc, router, toast],
  );
}
