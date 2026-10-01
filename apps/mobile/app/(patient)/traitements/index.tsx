import { PharmacyOrdersListScreen } from '@/features/pharmacy-orders/screens/PharmacyOrdersListScreen';

export default function PatientTreatmentsRoute() {
  return <PharmacyOrdersListScreen rolePrefix="/(patient)" scope="patient" />;
}
