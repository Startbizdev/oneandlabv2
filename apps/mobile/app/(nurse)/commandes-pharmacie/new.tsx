import { PharmacyOrderWizardScreen } from '@/features/pharmacy-orders/screens/PharmacyOrderWizardScreen';
import { useLocalSearchParams } from 'expo-router';

export default function NursePharmacyOrderNewRoute() {
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  return <PharmacyOrderWizardScreen rolePrefix="/(nurse)" initialPatientId={patientId} />;
}
