import { useState } from 'react';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { PatientAiHeaderMenuButton } from '@/features/ai-hub/components/PatientAiHeaderMenuButton';
import { PatientAiMockScreen } from '@/features/ai-hub/screens/PatientAiMockScreen';
import { HeaderTitleText } from '@/navigation/HeaderTitle';

export default function PatientAiTab() {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <TabScreenFrame
      title={<HeaderTitleText title="Assistant Cary" />}      headerRight={<PatientAiHeaderMenuButton onPress={() => setHistoryOpen(true)} />}
      shellStyle={{ flex: 1 }}
    >
      <PatientAiMockScreen historyOpen={historyOpen} onHistoryOpenChange={setHistoryOpen} />
    </TabScreenFrame>
  );
}
