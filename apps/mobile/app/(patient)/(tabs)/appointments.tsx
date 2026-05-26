import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { PatientAppointmentsListScreen } from '@/features/patient/screens/PatientAppointmentsListScreen';
import { HeaderLogo } from '@/navigation/HeaderLogo';
import { tabHeaderNotificationRight } from '@/navigation/HeaderNotificationButton';

export default function PatientAppointmentsTab() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => <HeaderLogo size="lg" />,
      headerRight: tabHeaderNotificationRight(),
    });
  }, [navigation]);

  return <PatientAppointmentsListScreen />;
}
