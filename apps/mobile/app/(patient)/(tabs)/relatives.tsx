import { useState } from 'react';
import { Heart } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { ScreenFab } from '@/components/ui/ScreenFab';
import { TAB_HEADER_SF } from '@/components/navigation/RoleNativeTabsLayout';
import { PatientRelativesScreen } from '@/features/patient/screens/PatientRelativesScreen';
import { useActiveTabRoute } from '@/lib/hooks/use-active-tab-route';
import { HeaderActionButton } from '@/navigation/HeaderActionButton';
import { HeaderNotificationBell } from '@/navigation/HeaderNotificationButton';
import { TitledTabScreenFrame } from '@/navigation/tab-screen-frames';
import { spacing } from '@/theme';

export default function PatientRelatives() {
  const [createOpen, setCreateOpen] = useState(false);
  const showFab = useActiveTabRoute('relatives');
  const openCreate = () => setCreateOpen(true);

  return (
    <TitledTabScreenFrame
      title="Mes proches"
      symbol={TAB_HEADER_SF.relatives}
      fallbackIcon={Heart}
      headerRight={
        <Row gap={spacing[2]} align="center">
          <HeaderActionButton kind="add-relative" onPress={openCreate} />
          <HeaderNotificationBell />
        </Row>
      }
      floatingAction={
        showFab ? (
          <ScreenFab onPress={openCreate} accessibilityLabel="Ajouter un proche" />
        ) : null
      }
    >
      <PatientRelativesScreen createOpen={createOpen} onCreateOpenChange={setCreateOpen} />
    </TitledTabScreenFrame>
  );
}
