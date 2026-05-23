import { useLocalSearchParams } from 'expo-router';
import { RescheduleAppointmentScreen } from '@/features/appointments/reschedule/screens/RescheduleAppointmentScreen';

export default function NurseRescheduleAppointment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RescheduleAppointmentScreen
      appointmentId={id}
      role="nurse"
      basePath="/(nurse)"
    />
  );
}
