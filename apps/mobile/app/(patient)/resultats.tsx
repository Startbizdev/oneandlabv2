import { LabResultsScreen } from '@/features/lab-results/screens/LabResultsScreen';

export default function PatientLabResultsRoute() {
  return <LabResultsScreen role="patient" rolePrefix="/(patient)" />;
}
