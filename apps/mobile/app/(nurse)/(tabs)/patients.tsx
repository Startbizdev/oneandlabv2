import { useState } from 'react';
import { Row } from '@/components/layout/primitives';
import { ScreenFab } from '@/components/ui/ScreenFab';
import { PatientsListScreen } from '@/features/patients/screens/PatientsListScreen';
import { useActiveTabRoute } from '@/lib/hooks/use-active-tab-route';
import { HeaderActionButton } from '@/navigation/HeaderActionButton';
import { HeaderNotificationBell } from '@/navigation/HeaderNotificationButton';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';
import { spacing } from '@/theme';

export default function NursePatients() {
  const [createOpen, setCreateOpen] = useState(false);
  const showFab = useActiveTabRoute('patients');
  const openCreate = () => setCreateOpen(true);

  return (
    <TitledTabScreenFrame
      title="Patients"
      headerRight={
        <Row gap={spacing[2]} align="center">
          <HeaderActionButton kind="add-person" onPress={openCreate} />
          <HeaderNotificationBell />
        </Row>
      }
      floatingAction={
        showFab ? (
          <ScreenFab onPress={openCreate} accessibilityLabel="Ajouter un patient" />
        ) : null
      }
    >
      <PatientsListScreen
        rolePrefix="/(nurse)"
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
      />
    </TitledTabScreenFrame>
  );
}
