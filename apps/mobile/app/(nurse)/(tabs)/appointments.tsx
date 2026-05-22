import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { NurseAppointmentsListScreen } from '@/features/nurse/screens/NurseAppointmentsListScreen';
import { HeaderLogo } from '@/navigation/HeaderLogo';
import { HeaderNotificationBell } from '@/navigation/HeaderNotificationButton';

export default function NurseAppointments() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => <HeaderLogo size="lg" />,
      headerRight: () => <HeaderNotificationBell />,
    });
  }, [navigation]);

  return <NurseAppointmentsListScreen />;
}
