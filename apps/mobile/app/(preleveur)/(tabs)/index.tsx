import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { PreleveurAppointmentsListScreen } from '@/features/appointments/screens/PreleveurAppointmentsListScreen';
import { useGreetingTitle } from '@/navigation/use-greeting-title';

export default function PreleveurHome() {
  const greeting = useGreetingTitle();
  return (
    <TabScreenFrame title={greeting}>
      <PreleveurAppointmentsListScreen
        bookHref="/(preleveur)/appointments/new"
        bookLabel="Demander un prélèvement"
      />
    </TabScreenFrame>
  );
}
