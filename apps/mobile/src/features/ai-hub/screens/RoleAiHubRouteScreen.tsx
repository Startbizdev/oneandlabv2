import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import type { UserRole } from '@oneandlab/shared-types';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { PatientAiHeaderMenuButton } from '@/features/ai-hub/components/PatientAiHeaderMenuButton';
import { CaryAiHubScreen } from '@/features/ai-hub/screens/CaryAiHubScreen';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';

const TITLE = 'Assistant Cary';

type Props = {
  role: UserRole | string;
  showBackButton?: boolean;
};

/** Hub Cary IA — stack (pro/nurse/preleveur) ou onglet patient. */
export function RoleAiHubRouteScreen({ role, showBackButton = false }: Props) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const params = useLocalSearchParams<{
    conversation_type?: string;
    patient_id?: string;
    appointment_id?: string;
    lab_result_id?: string;
    initial_message?: string;
  }>();

  const init = useMemo(
    () => ({
      conversationType: params.conversation_type,
      patientId: params.patient_id,
      appointmentId: params.appointment_id,
      labResultId: params.lab_result_id,
      initialMessage: params.initial_message,
    }),
    [
      params.appointment_id,
      params.conversation_type,
      params.initial_message,
      params.lab_result_id,
      params.patient_id,
    ],
  );

  const menu = <PatientAiHeaderMenuButton onPress={() => setHistoryOpen(true)} />;
  const hub = (
    <CaryAiHubScreen
      role={role}
      historyOpen={historyOpen}
      onHistoryOpenChange={setHistoryOpen}
      init={init}
    />
  );

  if (showBackButton) {
    return (
      <StackChromeScreen title={TITLE} headerRight={menu}>
        {hub}
      </StackChromeScreen>
    );
  }
  return (
    <TabScreenFrame title={TITLE} headerRight={menu}>
      {hub}
    </TabScreenFrame>
  );
}
