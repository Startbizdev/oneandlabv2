import { usePendingOffersPoll } from '@/features/appointments/hooks/use-pending-offers-poll';
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';
import { useAuthStore } from '@/store/auth-store';

/** Badge cloche : notifications non lues + offres RDV en attente (infirmier). */
export function useHeaderBellBadgeCount() {
  const role = useAuthStore((s) => s.user?.role);
  const unread = useUnreadNotificationsCount();
  const offersEnabled = role === 'nurse';
  const { data: pending } = usePendingOffersPoll(offersEnabled);
  const pendingCount = offersEnabled ? (pending?.length ?? 0) : 0;
  return unread + pendingCount;
}
