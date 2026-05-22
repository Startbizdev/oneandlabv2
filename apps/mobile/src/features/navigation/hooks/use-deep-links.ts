import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';

/**
 * Deep links — aligné dashboard.vue (openAppointment, shareToken, alreadyAccepted).
 */
export function useDeepLinks() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    function handle(url: string) {
      const parsed = Linking.parse(url);
      const path = parsed.path ?? '';
      const q = parsed.queryParams ?? {};

      const openAppointment = q.openAppointment ?? q.appointment_id;
      if (openAppointment && typeof openAppointment === 'string') {
        const shareToken = typeof q.shareToken === 'string' ? q.shareToken : null;
        if (shareToken) {
          useOfferQueueStore.getState().setShareToken(shareToken);
        }
        if (user?.role === 'nurse' && user.id) {
          void useOfferQueueStore.getState().openIncomingOffer(openAppointment, 'nurse', user.id);
          router.replace('/(nurse)/(tabs)/demandes' as never);
          return;
        }
        if (user?.role === 'preleveur') {
          router.push(`/(preleveur)/appointment/${openAppointment}` as never);
          return;
        }
        if (user?.role === 'pro') {
          router.push(`/(pro)/appointment/${openAppointment}` as never);
        }
        return;
      }

      if (q.alreadyAccepted === '1' && user?.role === 'preleveur' && openAppointment) {
        router.push(
          `/(preleveur)/appointment/${openAppointment}?alreadyAccepted=1` as never,
        );
      }

      if (path.includes('notifications')) {
        router.push(getNotificationsPath(user?.role));
      }
    }

    void Linking.getInitialURL().then((url) => {
      if (url) handle(url);
    });
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, [router, user?.role]);
}
