import { TourneeScreen } from '@/features/tournee/screens/TourneeScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function PreleveurTournee() {
  return (
    <TitledTabScreenFrame title="Tournée">
      <TourneeScreen />
    </TitledTabScreenFrame>
  );
}
