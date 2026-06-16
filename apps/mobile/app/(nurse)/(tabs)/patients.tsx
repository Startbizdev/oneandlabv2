import { Users } from 'lucide-react-native';
import { TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { PatientsListScreen } from '@/features/patients/screens/PatientsListScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function NursePatients() {
  return (
    <TitledTabScreenFrame title="Patients" symbol={TAB_HEADER_SF.patients} fallbackIcon={Users}>
      <PatientsListScreen rolePrefix="/(nurse)" />
    </TitledTabScreenFrame>
  );
}
