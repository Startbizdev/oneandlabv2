import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { RoleFilteredAppointmentsListScreen } from '@/features/appointments/screens/RoleFilteredAppointmentsListScreen';
import { HeaderGreeting } from '@/navigation/HeaderGreeting';
import { tabHeaderNotificationRight } from '@/navigation/HeaderNotificationButton';

export default function ProAppointmentsTab() {
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
      <RoleFilteredAppointmentsListScreen
        role="pro"
        detailPathPrefix="/(pro)/appointment"
        bookHref="/(pro)/appointments/new"
        bookLabel="Prendre un rendez-vous"
      />
    </TabScreenShell>
  );
}
