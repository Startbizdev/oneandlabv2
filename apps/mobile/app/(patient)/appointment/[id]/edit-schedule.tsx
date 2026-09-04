import { useLocalSearchParams } from 'expo-router';
import { PatientEditScheduleScreen } from '@/features/appointments/patient-schedule/screens/PatientEditScheduleScreen';

export default function PatientEditScheduleRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PatientEditScheduleScreen appointmentId={id} />;
}
