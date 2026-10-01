import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { RoleFilteredAppointmentsListScreen } from '@/features/appointments/screens/RoleFilteredAppointmentsListScreen';
import { useGreetingTitle } from '@/navigation/use-greeting-title';

export default function ProAppointmentsTab() {
  const greeting = useGreetingTitle();
  return (
    <TabScreenFrame title={greeting}>
      <RoleFilteredAppointmentsListScreen bookHref="/(pro)/appointments/new" />
    </TabScreenFrame>
  );
}
