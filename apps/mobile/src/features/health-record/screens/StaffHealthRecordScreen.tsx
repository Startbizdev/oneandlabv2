import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import {
  useStackContentTopInset,
  useStackScrollConfig,
  STACK_SCENE_CONTENT_TOP_GAP,
} from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { PassageFormHealthRecordPanel } from '@/features/nurse-passage/components/PassageFormHealthRecordPanel';
import { spacing } from '@/theme';

export function StaffHealthRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = typeof id === 'string' ? id : '';
  const [refreshKey, setRefreshKey] = useState(0);
  const scrollConfig = useStackScrollConfig(
    { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
    { extraTop: STACK_SCENE_CONTENT_TOP_GAP },
  );
  const contentTopInset = useStackContentTopInset();
  const { refreshing, onRefresh } = useManualRefresh(async () => {
    setRefreshKey((k) => k + 1);
  });

  if (!patientId) {
    return (
      <StackChromeScreen>
        <View style={{ paddingTop: contentTopInset, paddingHorizontal: spacing[4] }} />
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen>
      <Stack.Screen options={{ title: 'Carnet de santé' }} />
      <ScrollView
        {...spreadTabSceneScrollProps(scrollConfig)}
        contentContainerStyle={scrollConfig.contentContainerStyle}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <PassageFormHealthRecordPanel
          patientId={patientId}
          variant="screen"
          refreshKey={refreshKey}
        />
      </ScrollView>
    </StackChromeScreen>
  );
}
