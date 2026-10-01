import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { appointmentDetailHref, appointmentsListHref } from '@/navigation/role-hrefs';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';

/** Retour depuis la messagerie : fiche RDV si ouverte par notification, sinon pile précédente. */
export function useLeaveConversation(
  appointmentId: string,
  userRole: string | undefined,
  fromNotification?: string,
) {
  const navigation = useNavigation();
  const router = useRouter();

  return useCallback(() => {
    const prefix = roleRoutePrefix(userRole);
    if (fromNotification === '1' && appointmentId) {
      router.replace(appointmentDetailHref(prefix, appointmentId));
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    if (appointmentId) {
      router.replace(appointmentDetailHref(prefix, appointmentId));
      return;
    }
    router.replace(appointmentsListHref(prefix));
  }, [appointmentId, fromNotification, navigation, router, userRole]);
}
