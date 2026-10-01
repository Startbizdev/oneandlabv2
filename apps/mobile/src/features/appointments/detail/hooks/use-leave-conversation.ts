import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
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
    const detailHref = `${roleRoutePrefix(userRole)}/appointment/${appointmentId}`;
    if (fromNotification === '1' && appointmentId) {
      router.replace(detailHref as never);
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
      router.replace(detailHref as never);
      return;
    }
    router.replace(`${roleRoutePrefix(userRole)}/(tabs)` as never);
  }, [appointmentId, fromNotification, navigation, router, userRole]);
}
