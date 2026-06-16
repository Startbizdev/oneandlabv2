import { PreleveurAppointmentsListScreen } from '@/features/appointments/screens/PreleveurAppointmentsListScreen';
import { AppointmentsTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function PreleveurHome() {
  return (
    <AppointmentsTabScreenFrame>
      <PreleveurAppointmentsListScreen detailPathPrefix="/(preleveur)/appointment" />
    </AppointmentsTabScreenFrame>
  );
}
