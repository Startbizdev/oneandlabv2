import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { canShowReceiveTab, notificationShouldRefreshAppointmentsList } from '@oneandlab/shared-utils';
import { pharmacyModuleFlagsQueryOptions } from '@/features/pharmacy-orders/hooks/pharmacy-module-flags-query';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
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

async function pharmacyCanReceiveFor(userId: string): Promise<boolean> {
  try {
    const flags = await queryClient.fetchQuery(pharmacyModuleFlagsQueryOptions(userId));
    return canShowReceiveTab(flags);
  } catch (error: unknown) {
    console.warn('[notifications] droits pharmacie indisponibles', error);
    return false;
  }
}

async function navigateFromNotificationData(data: Record<string, unknown>) {
  const user = useAuthStore.getState().user;
  const role = user?.role;
  const pharmacyCanReceive = user?.role === 'pro' ? await pharmacyCanReceiveFor(user.id) : false;
  const href = resolveNotificationNavigation(
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
    { pharmacyCanReceive },
  );
  if (href) router.push(href);
}

function maybeRefreshAppointmentsFromPush(data: Record<string, unknown>) {
  const type = typeof data.type === 'string' ? data.type : undefined;
  if (!notificationShouldRefreshAppointmentsList(type, data)) return;
  void queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread });
}

export function registerNotificationHandlers() {
  Notifications.addNotificationReceivedListener((notification) => {
    const data = notification.request.content.data as Record<string, unknown>;
    maybeRefreshAppointmentsFromPush(data);
  });

  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    void navigateFromNotificationData(data);
  });
}
