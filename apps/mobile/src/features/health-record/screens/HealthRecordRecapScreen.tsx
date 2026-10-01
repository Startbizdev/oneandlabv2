import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { Row } from '@/components/layout/primitives';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { HealthRecordProgressRing } from '../components/HealthRecordProgressRing';
import { HealthRecordSectionRecap } from '../components/HealthRecordSectionRecap';
import { HealthRecordGapActionCard } from '../components/HealthRecordGapActionCard';
import { fetchHealthRecordRecap, recordGapAction } from '../api/health-record.service';
import { healthRecordQueryKeys } from '../hooks/use-health-record-completion';
import { healthRecordHeroSubtitle } from '../utils/health-record-display';
import { HealthSyncStatusCard } from '@/features/health-sync/components/HealthSyncStatusCard';
import { HealthSourceRevokeSheet } from '@/features/health-sync/components/HealthSourceRevokeSheet';
import { useHealthSourceConnection } from '@/features/health-sync/hooks/use-health-source-connection';
import { buildHealthMetricStats, buildHealthInsights, isHealthSyncRecent } from '@/features/health-sync/utils/health-metric-stats';
import { HealthInsightCards } from '@/features/health-sync/components/HealthInsightCards';
import { radius, spacing, progressRingSize, AppText, useStyles, font, type Theme } from '@/theme';

export function HealthRecordRecapScreen() {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const recapQ = useQuery({
    queryKey: healthRecordQueryKeys.recap,
    queryFn: fetchHealthRecordRecap,
  });
  const healthConnection = useHealthSourceConnection();
  const { refreshing, onRefresh } = useManualRefresh(async () => {
    await Promise.all([recapQ.refetch(), healthConnection.refetchAll()]);
  });

  const data = recapQ.data;
  const percent = data?.completion?.percent ?? 0;
  const healthStats = useMemo(
    () => buildHealthMetricStats(healthConnection.dashboardQ.data),
    [healthConnection.dashboardQ.data],
  );
  const healthInsights = useMemo(
    () => buildHealthInsights(healthConnection.dashboardQ.data),
    [healthConnection.dashboardQ.data],
  );
  const allGaps = useMemo(() => (data?.open_gaps ?? []).filter((g) => g?.gap_key), [data?.open_gaps]);
  const completeGap = percent < 100 ? allGaps.find((g) => g.action === 'complete_carnet') : undefined;
  const openGaps = useMemo(() => {
    const syncFresh = healthConnection.connected && isHealthSyncRecent(healthConnection.lastSyncAt);
    return allGaps.filter(
      (g) => g !== completeGap && !(syncFresh && g.gap_key === 'health_sync_stale'),
    );
  }, [allGaps, completeGap, healthConnection.connected, healthConnection.lastSyncAt]);
  const trends = (data?.trends ?? []).flatMap((t) => (t.observation_fr ? [t.observation_fr] : []));

  if (recapQ.isLoading && !data) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <SkeletonList count={5} />
        </View>
      </StackChromeScreen>
    );
  }

  if (recapQ.isError && !data) {
    return (
      <StackChromeScreen>
        <View style={styles.errorWrap}>
          <ErrorState
            error={recapQ.error}
            title="Carnet indisponible"
            onRetry={() => void recapQ.refetch()}
          />
        </View>
      </StackChromeScreen>
    );
  }

  const openSection = (sectionId: string) =>
    router.push({ pathname: '/(patient)/health-record/wizard', params: { section: sectionId } });

  return (
    <StackChromeScreen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <Row gap={spacing[4]} align="center">
          <HealthRecordProgressRing percent={percent} size={progressRingSize.lg} strokeWidth={6} />
          <AppText variant="secondary" style={styles.heroText}>
            {completeGap?.label_fr ?? healthRecordHeroSubtitle(percent)}
          </AppText>
        </Row>

        {percent < 100 ? (
          <Button
            title="Compléter mon carnet"
            size="lg"
            onPress={() => {
              if (completeGap) {
                recordGapAction(completeGap.gap_key, 'clicked').catch((e: unknown) => {
                  console.warn('[health-record] gap action not recorded', completeGap.gap_key, e);
                });
              }
              router.push('/(patient)/health-record/wizard');
            }}
            fullWidth
          />
        ) : null}

        {openGaps.length > 0 ? (
          <View style={styles.block}>
            <AppText style={styles.blockTitle} accessibilityRole="header">
              Suggestions
            </AppText>
            {openGaps.map((gap) => (
              <HealthRecordGapActionCard key={gap.gap_key} gap={gap} />
            ))}
          </View>
        ) : null}

        <View style={styles.block}>
          <AppText style={styles.blockTitle} accessibilityRole="header">
            Sections
          </AppText>
          <View style={styles.sectionCard}>
            {(data?.sections ?? []).map((section, index) => (
              <View key={section.id}>
                {index > 0 ? <View style={styles.sectionDivider} /> : null}
                <HealthRecordSectionRecap section={section} embedded hideEmptyItems onEdit={openSection} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.block}>
          <AppText style={styles.blockTitle} accessibilityRole="header">
            Données connectées
          </AppText>
          <HealthSyncStatusCard
            connected={healthConnection.connected}
            lastSyncAt={healthConnection.lastSyncAt}
            syncing={healthConnection.syncing}
            stats={healthStats}
            compact
            onConnect={() => void healthConnection.connectOrSync()}
            onSync={() => void healthConnection.connectOrSync()}
            onDisconnect={healthConnection.connected ? healthConnection.revokeConnection : undefined}
          />
          {healthConnection.connected && healthInsights.length > 0 ? (
            <HealthInsightCards insights={healthInsights.slice(0, 2)} />
          ) : null}
          <Button
            title="Voir mes graphiques"
            variant="ghost"
            onPress={() => router.push('/(patient)/health-data')}
            fullWidth
          />
        </View>

        {trends.length > 0 ? (
          <View style={styles.block}>
            <AppText style={styles.blockTitle} accessibilityRole="header">
              Tendances sur 7 jours
            </AppText>
            {trends.map((observation) => (
              <AppText key={observation} variant="secondary">
                {observation}
              </AppText>
            ))}
          </View>
        ) : null}

        {data?.disclaimer_fr ? (
          <AppText variant="caption" style={styles.disclaimer}>
            {data.disclaimer_fr}
          </AppText>
        ) : null}
      </ScrollView>
      <HealthSourceRevokeSheet {...healthConnection.revokeSheet} />
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    loading: { minWidth: 0, flex: 1, padding: spacing[4], paddingTop: spacing[3] },
    errorWrap: { minWidth: 0, flex: 1, padding: spacing[4], justifyContent: 'center' as const },
    scrollContent: {
      paddingTop: spacing[4],
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[10],
      gap: spacing[6],
    },
    heroText: { flex: 1, minWidth: 0 },
    block: { gap: spacing[3] },
    blockTitle: {
      ...text.caption,
      ...font.semiBold,
      color: c.textSecondary,
      paddingHorizontal: spacing[1],
    },
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    sectionDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
      marginHorizontal: spacing[4],
    },
    disclaimer: { textAlign: 'center' as const, color: c.textTertiary },
  };
}
