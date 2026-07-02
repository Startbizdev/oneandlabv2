import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useRouter } from 'expo-router';
import { RefreshControl, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { HeartPulse } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { Row } from '@/components/layout/primitives';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackContentTopInset, useStackScrollConfig, STACK_SCENE_CONTENT_TOP_GAP } from '@/navigation/use-stack-scroll-config';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { HealthRecordProgressRing } from '../components/HealthRecordProgressRing';
import { HealthRecordSectionRecap } from '../components/HealthRecordSectionRecap';
import { HealthRecordGapActionCard } from '../components/HealthRecordGapActionCard';
import { fetchHealthRecordRecap } from '../api/health-record.service';
import { healthRecordQueryKeys } from '../hooks/use-health-record-completion';
import { healthRecordHeroSubtitle } from '../utils/health-record-display';
import { HealthSyncStatusCard } from '@/features/health-sync/components/HealthSyncStatusCard';
import { useHealthSourceConnection } from '@/features/health-sync/hooks/use-health-source-connection';
import { buildHealthMetricStats, buildHealthInsights, isHealthSyncRecent } from '@/features/health-sync/utils/health-metric-stats';
import { HealthInsightCards } from '@/features/health-sync/components/HealthInsightCards';
import { useMemo } from 'react';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export function HealthRecordRecapScreen() {
  const styles = useThemedStyles(buildStyles, 'HealthRecordRecapScreen');
  const c = useAppColors();
  const router = useRouter();
  const recapQ = useQuery({
    queryKey: healthRecordQueryKeys.recap,
    queryFn: fetchHealthRecordRecap,
  });
  const scrollConfig = useStackScrollConfig(styles.scrollContent, {
    extraTop: STACK_SCENE_CONTENT_TOP_GAP,
  });
  const contentTopInset = useStackContentTopInset();
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
  const openGaps = useMemo(() => {
    const gaps = (data?.open_gaps ?? []).filter((g) => g?.gap_key);
    if (!healthConnection.connected || !isHealthSyncRecent(healthConnection.lastSyncAt)) {
      return gaps;
    }
    return gaps.filter((g) => g.gap_key !== 'health_sync_stale');
  }, [data?.open_gaps, healthConnection.connected, healthConnection.lastSyncAt]);

  if (recapQ.isLoading && !data) {
    return (
      <StackChromeScreen>
        <View style={[styles.loading, { paddingTop: contentTopInset }]}>
          <SkeletonList count={5} />
        </View>
      </StackChromeScreen>
    );
  }

  if (recapQ.isError) {
    return (
      <StackChromeScreen>
        <View style={[styles.errorWrap, { paddingTop: contentTopInset }]}>
          <EmptyState
            title="Récap indisponible"
            description={
              recapQ.error instanceof Error ? recapQ.error.message : 'Vérifiez votre connexion.'
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
      <Animated.ScrollView
        {...spreadTabSceneScrollProps(scrollConfig)}
        contentContainerStyle={scrollConfig.contentContainerStyle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={scrollConfig.refreshProgressOffset}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(320).springify()} style={[styles.heroCard, elevation.sm]}>
          <Row gap={spacing[4]} align="center">
            <HealthRecordProgressRing percent={percent} size={72} strokeWidth={6} />
            <View style={styles.heroText}>
              <Row gap={spacing[2]} align="center">
                <View style={[styles.heroIcon, { backgroundColor: c.primaryLight }]}>
                  <HeartPulse size={16} color={c.primary} strokeWidth={2} />
                </View>
                <Text style={styles.heroTitle}>Mon carnet de santé</Text>
              </Row>
              <Text style={styles.heroSub}>{healthRecordHeroSubtitle(percent)}</Text>
            </View>
          </Row>
        </Animated.View>

        {percent < 100 ? (
          <Button
            title="Répondre aux questionnaires"
            onPress={() => router.push('/(patient)/health-record/wizard' as never)}
            fullWidth
            style={styles.cta}
          />
        ) : null}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Données connectées</Text>
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
          <Button
            title="Voir mes graphiques"
            variant="outline"
            size="sm"
            onPress={() => router.push('/(patient)/health-data' as never)}
            fullWidth
          />
          {healthConnection.connected && healthInsights.length > 0 ? (
            <HealthInsightCards insights={healthInsights.slice(0, 2)} />
          ) : null}
        </View>

        {openGaps.length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Suggestions de suivi</Text>
            {openGaps.map((gap) => (
              <HealthRecordGapActionCard key={gap.gap_key} gap={gap} />
            ))}
          </View>
        ) : null}

        {(data?.trends ?? []).length > 0 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Tendances (7 j)</Text>
            {data!.trends!.map((t) => (
              <View key={t.observation_fr} style={styles.trendBadge}>
                <Text style={styles.trendText}>{t.observation_fr}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Sections</Text>
          <View style={[styles.sectionCard, elevation.xs]}>
            {(data?.sections ?? []).map((section, index) => (
              <View key={section.id}>
                {index > 0 ? <View style={styles.sectionDivider} /> : null}
                <HealthRecordSectionRecap
                  section={section}
                  embedded
                  onEdit={(sectionId) =>
                    router.push(`/(patient)/health-record/wizard?section=${sectionId}` as never)
                  }
                />
              </View>
            ))}
          </View>
        </View>

        {data?.disclaimer_fr ? (
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimer}>{data.disclaimer_fr}</Text>
          </View>
        ) : null}
      </Animated.ScrollView>
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
    loading: { flex: 1, padding: spacing[4] },
    errorWrap: { flex: 1, padding: spacing[4], justifyContent: 'center' as const },
    scrollContent: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[10],
      gap: spacing[4],
    },
    heroCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
    },
    heroIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.md,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    heroText: { flex: 1, minWidth: 0, gap: spacing[1] },
    heroTitle: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
    },
    heroSub: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.45,
    },
    cta: { marginTop: spacing[1] },
    block: { gap: spacing[3] },
    blockTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden' as const,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: c.borderLight,
      marginHorizontal: spacing[4],
    },
    trendBadge: {
      backgroundColor: c.primaryLight,
      borderRadius: radius.lg,
      padding: spacing[3],
    },
    trendText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: fontSize.sm * 1.45,
    },
    disclaimerBox: {
      backgroundColor: c.surfaceAlt,
      borderRadius: radius.lg,
      padding: spacing[4],
    },
    disclaimer: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      lineHeight: fontSize.xs * 1.6,
      textAlign: 'center' as const,
    },
  };
}
