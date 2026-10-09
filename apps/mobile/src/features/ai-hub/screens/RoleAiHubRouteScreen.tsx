import type { MobileRole } from '@oneandlab/shared-constants';
import { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TabScreenFrame } from '@/components/navigation/TabScreenFrame';
import { PatientAiHeaderMenuButton } from '@/features/ai-hub/components/PatientAiHeaderMenuButton';
import { CaryAiHubScreen } from '@/features/ai-hub/screens/CaryAiHubScreen';
import { resolveAiConversationContext } from '@/features/ai-hub/utils/ai-conversation-context';
import type { AiDeepLinkParams } from '@/features/ai-hub/utils/ai-navigation';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';

const TITLE = 'Assistant Cary';

const CONTEXT_PARAMS_CLEARED: Record<keyof AiDeepLinkParams, undefined> = {
  conversation_type: undefined,
  patient_id: undefined,
  appointment_id: undefined,
  lab_result_id: undefined,
  initial_message: undefined,
};

type Props = {
  role: MobileRole;
  showBackButton?: boolean;
};

/** Hub Cary IA — stack (pro/nurse/preleveur) ou onglet patient. Les paramètres de route fixent la conversation. */
export function RoleAiHubRouteScreen({ role, showBackButton = false }: Props) {
  const router = useRouter();
  const [historyOpen, setHistoryOpen] = useState(false);
  const params = useLocalSearchParams<AiDeepLinkParams>();
  const { conversation_type, patient_id, appointment_id, lab_result_id, initial_message } = params;

  const context = useMemo(
    () => resolveAiConversationContext(role, { conversation_type, patient_id, appointment_id, lab_result_id, initial_message }),
    [appointment_id, conversation_type, initial_message, lab_result_id, patient_id, role],
  );

  const clearContext = useCallback(() => router.setParams(CONTEXT_PARAMS_CLEARED), [router]);
  const pickPatient = useCallback(
    (patientId: string) => router.setParams({ ...CONTEXT_PARAMS_CLEARED, patient_id: patientId }),
    [router],
  );

  const menu = <PatientAiHeaderMenuButton onPress={() => setHistoryOpen(true)} />;
  const hub = (
    <CaryAiHubScreen
      role={role}
      context={context}
      historyOpen={historyOpen}
      onHistoryOpenChange={setHistoryOpen}
      onClearContext={clearContext}
      onPickPatient={pickPatient}
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
