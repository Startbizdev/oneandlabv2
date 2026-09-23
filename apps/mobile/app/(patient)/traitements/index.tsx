import { PharmacyOrdersListScreen } from '@/features/pharmacy-orders/screens/PharmacyOrdersListScreen';

export default function PatientTreatmentsRoute() {
  return (
    <PharmacyOrdersListScreen
      rolePrefix="/(patient)"
      routeName="traitements"
      scope="patient"
      canCreate={false}
    />
  );
}
