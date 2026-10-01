import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';
import { useNavigationReady } from '@/navigation/use-navigation-ready';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import { offerLinkAppointmentId } from '@/features/navigation/utils/offer-link';

/**
 * Deep links — aligné dashboard.vue (openAppointment, shareToken, alreadyAccepted).
 */
export function useDeepLinks() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id);
  const { ready: navigationReady, canNavigate } = useNavigationReady();

  useEffect(() => {
    if (!navigationReady) return;
    function handle(url: string) {
      if (!canNavigate()) return;
      const q = Linking.parse(url).queryParams ?? {};

      const openAppointment = offerLinkAppointmentId(q);
      if (openAppointment) {
        const shareToken = typeof q.shareToken === 'string' ? q.shareToken : null;
        if (shareToken) {
          useOfferQueueStore.getState().setShareToken(shareToken);
        }
        if (role === 'nurse' && userId) {
          void useOfferQueueStore.getState().openIncomingOffer(openAppointment, 'nurse', userId);
          router.replace('/(nurse)/(tabs)/demandes');
          return;
        }
        if (role === 'preleveur') {
          const extra: Record<string, string> = q.alreadyAccepted === '1' ? { alreadyAccepted: '1' } : {};
          router.push(appointmentDetailHref('/(preleveur)', openAppointment, extra));
          return;
        }
        if (role === 'pro') {
          router.push(appointmentDetailHref('/(pro)', openAppointment));
        }
      }
    }

    void Linking.getInitialURL().then((url) => {
      if (url) handle(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [navigationReady, canNavigate, router, role, userId]);
}
