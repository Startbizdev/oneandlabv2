import { PatientRelativesScreen } from '@/features/patient/screens/PatientRelativesScreen';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';

export default function PatientRelativesRoute() {
  return (
    <StackChromeScreen>
      <PatientRelativesScreen />
    </StackChromeScreen>
  );
}
