import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { RoleFilteredAppointmentsListScreen } from '@/features/appointments/screens/RoleFilteredAppointmentsListScreen';
import { HeaderLogo } from '@/navigation/HeaderLogo';
import { HeaderNotificationBell } from '@/navigation/HeaderNotificationButton';

export default function ProAppointmentsTab() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => <HeaderLogo size="lg" />,
      headerRight: () => <HeaderNotificationBell />,
    });
  }, [navigation]);

  return (
    <RoleFilteredAppointmentsListScreen
      role="pro"
      detailPathPrefix="/(pro)/appointment"
      bookHref="/(pro)/appointments/new"
      bookLabel="Prendre un rendez-vous"
    />
  );
}
