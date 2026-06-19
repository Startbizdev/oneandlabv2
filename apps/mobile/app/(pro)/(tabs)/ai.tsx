import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { PatientAiHeaderMenuButton } from '@/features/ai-hub/components/PatientAiHeaderMenuButton';
import { CaryAiHubScreen } from '@/features/ai-hub/screens/CaryAiHubScreen';
import { HeaderTitleText } from '@/navigation/HeaderTitle';

export default function ProAiTab() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const params = useLocalSearchParams<{
    conversation_type?: string;
    patient_id?: string;
    appointment_id?: string;
    initial_message?: string;
  }>();

  const init = useMemo(
    () => ({
      conversationType: params.conversation_type,
      patientId: params.patient_id,
      appointmentId: params.appointment_id,
      initialMessage: params.initial_message,
    }),
    [params.appointment_id, params.conversation_type, params.initial_message, params.patient_id],
  );

  return (
    <TabScreenFrame
      title={<HeaderTitleText title="Assistant Cary" />}
      headerRight={<PatientAiHeaderMenuButton onPress={() => setHistoryOpen(true)} />}
      shellStyle={{ flex: 1 }}
    >
      <CaryAiHubScreen role="pro" historyOpen={historyOpen} onHistoryOpenChange={setHistoryOpen} init={init} />
    </TabScreenFrame>
  );
}
