import { useLocalSearchParams } from 'expo-router';
import { PatientPrescriptionsScreen } from '@/features/prescriptions/screens/PatientPrescriptionsScreen';

export default function NursePatientPrescriptionsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PatientPrescriptionsScreen patientId={id ?? ''} rolePrefix="/(nurse)" roleBase="nurse" />;
}
