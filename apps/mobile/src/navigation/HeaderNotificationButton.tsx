import type { ReactElement } from 'react';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { GlassHeaderButton } from '@/components/navigation/GlassHeaderButton';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { useHeaderBellBadgeCount } from '@/navigation/use-header-bell-badge';
import { useAuthStore } from '@/store/auth-store';

/** Cloche — factory React Navigation (écrans stack). */
export function tabHeaderNotificationRight(): () => ReactElement {
  return () => <HeaderNotificationBell />;
}

/** Cloche notifications — bouton glass natif iOS 26. */
export function HeaderNotificationBell() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const badgeCount = useHeaderBellBadgeCount();

  return (
    <GlassHeaderButton
      symbol="bell"
      accessibilityLabel="Notifications"
      badge={badgeCount}
      onPress={() => router.push(getNotificationsPath(role))}
      fallback={<Bell size={20} strokeWidth={2.25} />}
    />
  );
}
