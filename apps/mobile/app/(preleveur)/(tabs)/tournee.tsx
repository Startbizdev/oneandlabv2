import { TourneeScreen } from '@/features/tournee/screens/TourneeScreen';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';

export default function PreleveurTournee() {
  return (
    <TabScreenFrame title="Tournée">
      <TourneeScreen />
    </TabScreenFrame>
  );
}
