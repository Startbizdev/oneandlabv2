import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackContentTopInset, useStackScrollConfig, STACK_SCENE_CONTENT_TOP_GAP } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { HealthRecordProgressRing } from '../components/HealthRecordProgressRing';
import { HealthRecordSectionRecap } from '../components/HealthRecordSectionRecap';
import { fetchStaffHealthRecord } from '../api/health-record.service';
import { healthRecordQueryKeys } from '../hooks/use-health-record-completion';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function StaffHealthRecordScreen() {
  const styles = useThemedStyles(buildStyles, 'StaffHealthRecordScreen');
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = typeof id === 'string' ? id : '';
  const recapQ = useQuery({
    queryKey: healthRecordQueryKeys.staffRecap(patientId),
    queryFn: () => fetchStaffHealthRecord(patientId),
    enabled: patientId.length > 0,
  });
  const scrollConfig = useStackScrollConfig(styles.content, {
    extraTop: STACK_SCENE_CONTENT_TOP_GAP,
  });
  const contentTopInset = useStackContentTopInset();
  const { refreshing, onRefresh } = useManualRefresh(async () => {
    await recapQ.refetch();
  });

  const data = recapQ.data;

  if (recapQ.isLoading && !data) {
    return (
      <StackChromeScreen>
        <View style={{ paddingTop: contentTopInset, paddingHorizontal: spacing[4] }}>
          <SkeletonList rows={5} />
        </View>
      </StackChromeScreen>
    );
  }

  if (recapQ.isError || !patientId) {
    return (
      <StackChromeScreen>
        <View style={[styles.errorWrap, { paddingTop: contentTopInset }]}>
          <EmptyState
          title="Carnet inaccessible"
          description={
            recapQ.error instanceof Error ? recapQ.error.message : 'Droits insuffisants ou patient inconnu.'
          }
          actionLabel="Réessayer"
          onAction={() => void recapQ.refetch()}
        />
        </View>
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
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Données déclarées par le patient — à confirmer en consultation
          </Text>
        </View>

        <View style={styles.hero}>
          <HealthRecordProgressRing percent={data?.completion?.percent ?? 0} size={64} />
          <Text style={styles.heroMeta}>
            Complétion {data?.completion?.percent ?? 0} % · lecture seule
          </Text>
        </View>

        {(data?.open_gaps ?? []).length > 0 ? (
          <View style={styles.gaps}>
            <Text style={styles.blockTitle}>Écarts de suivi ouverts</Text>
            {data!.open_gaps.map((g) => (
              <Text key={g.gap_key} style={styles.gapRow}>
                · {g.label_fr}
              </Text>
            ))}
          </View>
        ) : null}

        {(data?.sections ?? []).map((section) => (
          <HealthRecordSectionRecap key={section.id} section={section} />
        ))}

        <Text style={styles.disclaimer}>{data?.disclaimer_fr}</Text>
      </ScrollView>
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
    content: { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
    errorWrap: {
      flex: 1,
      paddingHorizontal: spacing[4],
      justifyContent: 'center' as const,
    },
    banner: {
      backgroundColor: c.warningLight ?? c.primaryLight,
      borderRadius: 12,
      padding: spacing[3],
      marginBottom: spacing[4],
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    bannerText: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: 20,
    },
    hero: {
      alignItems: 'center' as const,
      gap: spacing[2],
      marginBottom: spacing[5],
    },
    heroMeta: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    gaps: { marginBottom: spacing[4] },
    blockTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      textTransform: 'uppercase' as const,
      marginBottom: spacing[2],
    },
    gapRow: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      marginBottom: spacing[1],
    },
    disclaimer: {
      marginTop: spacing[4],
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
  };
}
