import { Route } from 'lucide-react-native';
import { TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { TourneeScreen } from '@/features/tournee/screens/TourneeScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function PreleveurTournee() {
  return (
    <TitledTabScreenFrame title="Tournée" symbol={TAB_HEADER_SF.tournee} fallbackIcon={Route}>
      <TourneeScreen />
    </TitledTabScreenFrame>
  );
}
