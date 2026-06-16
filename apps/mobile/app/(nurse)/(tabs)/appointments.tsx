import { NurseAppointmentsListScreen } from '@/features/nurse/screens/NurseAppointmentsListScreen';
import { AppointmentsTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function NurseAppointments() {
  return (
    <AppointmentsTabScreenFrame>
      <NurseAppointmentsListScreen />
    </AppointmentsTabScreenFrame>
  );
}
