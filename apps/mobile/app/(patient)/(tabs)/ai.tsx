import { useLayoutEffect, useState } from 'react';
import { useNavigation } from 'expo-router';
import { TabScreenShell } from '@/components/navigation/TabScreenShell';
import { PatientAiHeaderMenuButton } from '@/features/ai-hub/components/PatientAiHeaderMenuButton';
import { PatientAiMockScreen } from '@/features/ai-hub/screens/PatientAiMockScreen';

export default function PatientAiTab() {
  const navigation = useNavigation();
  const [historyOpen, setHistoryOpen] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <PatientAiHeaderMenuButton onPress={() => setHistoryOpen(true)} />,
    });
  }, [navigation]);

  return (
    <TabScreenShell style={{ flex: 1 }}>
      <PatientAiMockScreen historyOpen={historyOpen} onHistoryOpenChange={setHistoryOpen} />
    </TabScreenShell>
  );
}
