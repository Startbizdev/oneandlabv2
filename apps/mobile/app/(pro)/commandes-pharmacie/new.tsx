import { PharmacyOrderWizardScreen } from '@/features/pharmacy-orders/screens/PharmacyOrderWizardScreen';
import { useLocalSearchParams } from 'expo-router';

export default function ProPharmacyOrderNewRoute() {
  const { patientId } = useLocalSearchParams<{ patientId?: string }>();
  return <PharmacyOrderWizardScreen rolePrefix="/(pro)" initialPatientId={patientId} />;
}
