import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { notificationShouldRefreshAppointmentsList } from '@oneandlab/shared-utils';
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

function isPharmacistEmploi(emploi: string | null | undefined): boolean {
  const e = (emploi ?? '').trim();
  return e.localeCompare('Pharmacien', undefined, { sensitivity: 'accent' }) === 0;
}

function navigateFromNotificationData(data: Record<string, unknown>) {
  const user = useAuthStore.getState().user;
  const role = user?.role;
  const pharmacyCanReceive = user?.role === 'pro' && isPharmacistEmploi(user.emploi);
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
    { pharmacyCanReceive },
  );
  if (target.kind !== 'route') return;
  router.push({
    pathname: target.pathname,
    params: target.params,
  } as never);
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
    navigateFromNotificationData(data);
  });
}
