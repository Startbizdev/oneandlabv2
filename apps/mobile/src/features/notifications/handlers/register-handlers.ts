import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';

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
  if (data.no_navigate === true || data.no_navigate === 'true') return;
  const aptId = data.appointment_id ?? data.appointmentId;
  const role = useAuthStore.getState().user?.role;
  if (!aptId || typeof aptId !== 'string') return;

  if (role === 'nurse') router.push(`/(nurse)/appointment/${aptId}`);
  else if (role === 'preleveur') router.push(`/(preleveur)/appointment/${aptId}`);
  else if (role === 'pro') router.push(`/(pro)/appointment/${aptId}`);
  else if (role === 'patient') router.push(`/(patient)/appointment/${aptId}`);
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
