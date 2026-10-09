import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { SceneScrollView } from '@/components/navigation/SceneScrollView';
import { SkeletonList } from '@/components/ui/skeletons';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { spacing, useStyles } from '@/theme';
import { AppointmentDetailBlockedEmptyState } from '../detail/components/AppointmentDetailBlockedEmptyState';
import { AppointmentDetailLoadError } from '../detail/components/AppointmentDetailLoadError';
import { RdvDocumentsPremiumPanel } from '../detail/components/RdvDocumentsPremiumPanel';
import { useAppointmentDetailScreen } from '../detail/hooks/use-appointment-detail-screen';
import { appointmentDocumentsOmitCarePhotos } from '../detail/utils/appointment-documents-list';

interface Props {
  role: string;
}

/** Documents d'un RDV, ouverts depuis la ligne « Documents » de sa fiche (tous rôles). */
export function AppointmentDocumentsScreen({ role }: Props) {
  const styles = useStyles(buildStyles);
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const id = idParam ?? '';
  const router = useRouter();
  const userId = useAuthStore((st) => st.user?.id);
  const s = useAppointmentDetailScreen(role, id, userId);
  const pullRefresh = useManualRefresh(async () => {
    s.refreshAll();
  });

  if (s.detailBlock) {
    return (
      <StackChromeScreen>
        <AppointmentDetailBlockedEmptyState onBack={() => router.back()} block={s.detailBlock} />
      </StackChromeScreen>
    );
  }

  if (s.detailError) {
    return (
      <StackChromeScreen>
        <AppointmentDetailLoadError
          error={s.detailError}
          onRetry={() => void s.retryDetail()}
          onBack={() => router.back()}
        />
      </StackChromeScreen>
    );
  }

  if (s.isLoading || !s.apt || !s.primary) {
    return (
      <StackChromeScreen>
        <View style={styles.content}>
          <SkeletonList count={5} itemHeight={72} gap={spacing[2]} />
        </View>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen>
      <SceneScrollView
        contentContainerStyle={styles.content}
        refreshing={pullRefresh.refreshing}
        onRefresh={pullRefresh.onRefresh}
      >
        <RdvDocumentsPremiumPanel
          appointmentId={id}
          apt={s.primary}
          role={role}
          docs={s.allDocuments}
          loading={s.docsLoading}
          error={s.docsError}
          onRetry={s.retryDocs}
          omitCarePhotos={appointmentDocumentsOmitCarePhotos(role, s.primary)}
        />
      </SceneScrollView>
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    content: {
      alignSelf: 'stretch' as const,
      width: '100%' as const,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[10],
    },
  };
}
