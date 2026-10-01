import { ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppRefreshControl } from '@/components/ui/AppRefreshControl';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { queryKeys } from '@/lib/query-keys';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { ProfileDocumentsPremiumPanel } from '@/features/profile/components/ProfileDocumentsPremiumPanel';
import { spacing, useStyles, type Theme } from '@/theme';

/** Documents du dossier patient (vue infirmier / pro). */
export function StaffPatientDocumentsScreen() {
  const styles = useStyles(buildStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();

  const pullRefresh = useManualRefresh(() =>
    qc.invalidateQueries({ queryKey: queryKeys.documents.patient(id ?? '') }),
  );

  return (
    <StackChromeScreen>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<AppRefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} />}
      >
        {id ? <ProfileDocumentsPremiumPanel patientUserId={id} /> : null}
      </ScrollView>
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    screen: { minWidth: 0, flex: 1, backgroundColor: c.background },
    content: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[3],
      paddingBottom: spacing[10],
      flexGrow: 1,
      width: '100%' as const,
    },
  };
}
