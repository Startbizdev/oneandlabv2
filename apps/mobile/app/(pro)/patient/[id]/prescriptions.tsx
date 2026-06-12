import { useLocalSearchParams } from 'expo-router';
import { PatientPrescriptionsScreen } from '@/features/prescriptions/screens/PatientPrescriptionsScreen';

export default function ProPatientPrescriptionsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PatientPrescriptionsScreen patientId={id ?? ''} rolePrefix="/(pro)" roleBase="pro" />;
}
