import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { PreleveurAppointmentsListScreen } from '@/features/appointments/screens/PreleveurAppointmentsListScreen';
import { HeaderGreeting } from '@/navigation/HeaderGreeting';

export default function PreleveurHome() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => <HeaderGreeting />,
    });
  }, [navigation]);

  return (
    <TabScreenShell>
      <PreleveurAppointmentsListScreen detailPathPrefix="/(preleveur)/appointment" />
    </TabScreenShell>
  );
}
