import { useState } from 'react';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { ScreenFab } from '@/components/ui/ScreenFab';
import { PreleveurPatientsListScreen } from '@/features/patients/screens/PreleveurPatientsListScreen';

export default function PreleveurPatientsTab() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <TabScreenFrame title="Mes patients">
      <PreleveurPatientsListScreen createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
      <ScreenFab onPress={() => setCreateOpen(true)} accessibilityLabel="Ajouter un patient" />
    </TabScreenFrame>
  );
}
