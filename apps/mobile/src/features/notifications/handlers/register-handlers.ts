import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import type { AppNotification } from '../api/notifications.service';
import { resolveNotificationNavigation } from '../utils/notification-navigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function navigateFromNotificationData(data: Record<string, unknown>) {
  const role = useAuthStore.getState().user?.role;
  const target = resolveNotificationNavigation(
    {
      id: String(data.notification_id ?? data.id ?? ''),
      type: typeof data.type === 'string' ? data.type : undefined,
      appointment_id:
        data.appointment_id != null
          ? String(data.appointment_id)
          : data.appointmentId != null
            ? String(data.appointmentId)
            : undefined,
      data,
    } satisfies AppNotification,
    role,
  );
  if (target.kind !== 'route') return;
  router.push({
    pathname: target.pathname,
    params: target.params,
  } as never);
}

export function registerNotificationHandlers() {
  Notifications.addNotificationReceivedListener(() => {
    // Foreground: TanStack polling also refreshes list
  });

  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    navigateFromNotificationData(data);
  });
}
