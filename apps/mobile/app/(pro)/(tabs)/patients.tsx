import { useState } from 'react';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { ScreenFab } from '@/components/ui/ScreenFab';
import { PatientsListScreen } from '@/features/patients/screens/PatientsListScreen';

export default function ProPatientsTab() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <TabScreenFrame title="Patients">
      <PatientsListScreen
        rolePrefix="/(pro)"
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
      />
      <ScreenFab onPress={() => setCreateOpen(true)} accessibilityLabel="Ajouter un patient" />
    </TabScreenFrame>
  );
}
