import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { TourneeScreen } from '@/features/tournee/screens/TourneeScreen';

export default function PreleveurTournee() {
  return (
    <TabScreenShell>
      <TourneeScreen />
    </TabScreenShell>
  );
}
