import { Heart } from 'lucide-react-native';
import { PatientRelativesScreen } from '@/features/patient/screens/PatientRelativesScreen';
import { TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function PatientRelatives() {
  return (
    <TitledTabScreenFrame title="Mes proches" symbol={TAB_HEADER_SF.relatives} fallbackIcon={Heart}>
      <PatientRelativesScreen />
    </TitledTabScreenFrame>
  );
}
