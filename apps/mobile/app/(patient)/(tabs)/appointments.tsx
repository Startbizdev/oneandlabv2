import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { PatientAppointmentsListScreen } from '@/features/patient/screens/PatientAppointmentsListScreen';
import { useGreetingTitle } from '@/navigation/use-greeting-title';

export default function PatientAppointmentsTab() {
  const greeting = useGreetingTitle();
  return (
    <TabScreenFrame title={greeting}>
      <PatientAppointmentsListScreen />
    </TabScreenFrame>
  );
}
