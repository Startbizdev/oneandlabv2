import { RoleFilteredAppointmentsListScreen } from '@/features/appointments/screens/RoleFilteredAppointmentsListScreen';
import { AppointmentsTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function ProAppointmentsTab() {
  return (
    <AppointmentsTabScreenFrame>
      <RoleFilteredAppointmentsListScreen
        role="pro"
        detailPathPrefix="/(pro)/appointment"
        bookHref="/(pro)/appointments/new"
      />
    </AppointmentsTabScreenFrame>
  );
}
