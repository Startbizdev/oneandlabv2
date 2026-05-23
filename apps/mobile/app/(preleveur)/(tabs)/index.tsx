import { useLayoutEffect } from 'react';
import { useNavigation } from 'expo-router';
import { PreleveurAppointmentsListScreen } from '@/features/appointments/screens/PreleveurAppointmentsListScreen';
import { HeaderLogo } from '@/navigation/HeaderLogo';

export default function PreleveurHome() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => <HeaderLogo size="lg" />,
    });
  }, [navigation]);

  return <PreleveurAppointmentsListScreen detailPathPrefix="/(preleveur)/appointment" />;
}
