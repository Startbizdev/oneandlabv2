import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { RoleFilteredAppointmentsListScreen } from '@/features/appointments/screens/RoleFilteredAppointmentsListScreen';
import { headerBarRightAction } from '@/navigation/HeaderNotificationButton';

export default function ProAppointmentsTab() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: headerBarRightAction('add', { href: '/(pro)/appointments/new' }),
    });
  }, [navigation]);

  return (
    <RoleFilteredAppointmentsListScreen
      role="pro"
      detailPathPrefix="/(pro)/appointment"
    />
  );
}
