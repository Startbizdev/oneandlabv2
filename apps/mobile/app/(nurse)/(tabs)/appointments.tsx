import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { NurseAppointmentsListScreen } from '@/features/nurse/screens/NurseAppointmentsListScreen';
import { HeaderGreeting } from '@/navigation/HeaderGreeting';
import { tabHeaderNotificationRight } from '@/navigation/HeaderNotificationButton';

export default function NurseAppointments() {
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
      <NurseAppointmentsListScreen />
    </TabScreenShell>
  );
}
