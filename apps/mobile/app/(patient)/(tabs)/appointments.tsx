import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { PatientAppointmentsListScreen } from '@/features/patient/screens/PatientAppointmentsListScreen';
import { HeaderLogo } from '@/navigation/HeaderLogo';
import { HeaderNotificationBell } from '@/navigation/HeaderNotificationButton';

export default function PatientAppointmentsTab() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => <HeaderLogo size="lg" />,
      headerRight: () => <HeaderNotificationBell />,
    });
  }, [navigation]);

  return <PatientAppointmentsListScreen />;
}
