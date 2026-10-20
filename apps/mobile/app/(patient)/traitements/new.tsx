import { useLocalSearchParams } from 'expo-router';
import { PharmacyOrderWizardScreen } from '@/features/pharmacy-orders/screens/PharmacyOrderWizardScreen';

export default function PatientTreatmentNewRoute() {
  const { pharmacy_id: pharmacyId, utm_qr: utmQr } = useLocalSearchParams<{ pharmacy_id?: string; utm_qr?: string }>();
  return <PharmacyOrderWizardScreen rolePrefix="/(patient)" initialPharmacyId={pharmacyId} utmQr={utmQr} />;
}
