import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { PatientAppointmentsListScreen } from '@/features/patient/screens/PatientAppointmentsListScreen';
import { HeaderGreeting } from '@/navigation/HeaderGreeting';
import { tabHeaderNotificationRight } from '@/navigation/HeaderNotificationButton';

export default function PatientAppointmentsTab() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => <HeaderGreeting />,
      headerRight: tabHeaderNotificationRight(),
    });
  }, [navigation]);

  return (
    <TabScreenShell>
      <PatientAppointmentsListScreen />
    </TabScreenShell>
  );
}
