import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { NurseAppointmentsListScreen } from '@/features/nurse/screens/NurseAppointmentsListScreen';
import { headerBarRightAction } from '@/navigation/HeaderNotificationButton';

export default function NurseAppointments() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: headerBarRightAction('add', { href: '/(nurse)/appointments/new' }),
    });
  }, [navigation]);

  return <NurseAppointmentsListScreen />;
}
