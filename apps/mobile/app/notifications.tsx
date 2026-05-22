import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { getNotificationsPath } from '@/navigation/notifications-route';

/** Ancienne route racine — redirige vers la stack du rôle connecté. */
export default function NotificationsRootRedirect() {
  const role = useAuthStore((s) => s.user?.role);
  return <Redirect href={getNotificationsPath(role)} />;
}
