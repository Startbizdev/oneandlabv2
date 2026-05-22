import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { PatientAppointmentsListScreen } from '@/features/patient/screens/PatientAppointmentsListScreen';
import { headerBarRightAction } from '@/navigation/HeaderNotificationButton';

export default function PatientAppointmentsTab() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: headerBarRightAction('book', { href: '/(patient)/booking/new' }),
    });
  }, [navigation]);

  return <PatientAppointmentsListScreen />;
}
