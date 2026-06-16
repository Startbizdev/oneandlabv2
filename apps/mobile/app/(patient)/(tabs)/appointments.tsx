import { PatientAppointmentsListScreen } from '@/features/patient/screens/PatientAppointmentsListScreen';
import { AppointmentsTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function PatientAppointmentsTab() {
  return (
    <AppointmentsTabScreenFrame>
      <PatientAppointmentsListScreen />
    </AppointmentsTabScreenFrame>
  );
}
