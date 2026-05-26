import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-unread-count';

/** Badge cloche : uniquement les notifications non lues (les offres RDV ont leur badge onglet Demandes). */
export function useHeaderBellBadgeCount() {
  return useUnreadNotificationsCount();
}
