import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { PatientReviewsScreen } from '@/features/patient/screens/PatientReviewsScreen';

export default function PatientReviews() {
  return (
    <TabScreenShell>
      <PatientReviewsScreen />
    </TabScreenShell>
  );
}
