import { NurseDemandesScreen } from '@/features/nurse/screens/NurseDemandesScreen';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';

export default function NurseDemandes() {
  return (
    <TitledTabScreenFrame
      title="Mes demandes"
    >
      <NurseDemandesScreen />
    </TitledTabScreenFrame>
  );
}
