import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { HeaderAction } from '@/components/navigation/HeaderAction';
import { getNotificationsPath } from '@/navigation/notifications-route';
import { useHeaderBellBadgeCount } from '@/navigation/use-header-bell-badge';
import { useAuthStore } from '@/store/auth-store';

/** Cloche notifications avec compteur de non-lues. */
export function HeaderNotificationBell() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const badgeCount = useHeaderBellBadgeCount();

  return (
    <HeaderAction
      icon={Bell}
      accessibilityLabel="Notifications"
      badge={badgeCount}
      onPress={() => router.push(getNotificationsPath(role))}
    />
  );
}
