import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useRouter } from 'expo-router';
import { Linking, Platform, RefreshControl, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { MessageCircle } from 'lucide-react-native';
import { ActionRowCard } from '@/components/ui/ActionRowCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { useTabSceneInsets } from '@/components/navigation/liquid-glass-header-inset';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackScrollConfig, STACK_SCENE_CONTENT_TOP_GAP } from '@/navigation/use-stack-scroll-config';
import { elevation, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { buildAiDeepLink } from '@/features/ai-hub/utils/ai-navigation';
import { HealthActivityHero } from '../components/HealthActivityHero';
import { HealthConnectOnboarding } from '../components/HealthConnectOnboarding';
import { HealthInsightCards } from '../components/HealthInsightCards';
import { HealthMetricChart } from '../components/HealthMetricChart';
import { HealthSyncStatusCard } from '../components/HealthSyncStatusCard';
import { useHealthAutoConnect } from '../hooks/use-health-auto-connect';
import { pickMetricSeries } from '../hooks/use-health-dashboard';
import { useHealthSourceConnection } from '../hooks/use-health-source-connection';
import {
  buildHealthInsights,
  buildHealthMetricStats,
  pickLatestMetricValue,
} from '../utils/health-metric-stats';
import { getHealthPlatformUiConfig } from '../utils/health-platform-config';
import { useMemo } from 'react';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';

interface Props {
  variant?: 'tab' | 'stack';
}

export function HealthDataScreen({ variant = 'stack' }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_health_sync_HealthDataScreen_styles');
  const c = useAppColors();
  const router = useRouter();
  const insets = useTabSceneInsets();
  const scrollConfig = useStackScrollConfig(styles.scrollContent, {
    extraTop: STACK_SCENE_CONTENT_TOP_GAP,
  });
  const connection = useHealthSourceConnection();
  const {
    dashboardQ,
    sourcesQ,
    connected,
    lastSyncAt,
    syncing,
    connectOrSync,
    revokeConnection,
    refetchAll,
  } = connection;

  const sourcesReady = !sourcesQ.isLoading || sourcesQ.data !== undefined;
  const { phase: autoPhase } = useHealthAutoConnect({
    enabled: variant === 'stack',
    connected,
    sourcesReady,
    syncing,
    onConnect: connectOrSync,
  });

  const { refreshing, onRefresh } = useManualRefresh(async () => {
    await refetchAll();
  });

  const data = dashboardQ.data;
  const stats = useMemo(() => buildHealthMetricStats(data), [data]);
  const insights = useMemo(() => buildHealthInsights(data), [data]);
  const loadingInitial = sourcesQ.isLoading && !sourcesQ.data;

  const weight = pickMetricSeries(data, 'weight');
  const heart = pickMetricSeries(data, 'heart_rate');
  const steps = pickMetricSeries(data, 'steps');
  const summary7 = data?.summary?.windows?.['7d']?.metrics;
  const hasData = data?.summary?.has_data;

  const todaySteps = pickLatestMetricValue(steps);
  const avgSteps7d = summary7?.steps ? summary7.steps.avg : null;
  const lastHeart = pickLatestMetricValue(heart);
  const lastWeight = pickLatestMetricValue(weight);

  const openPlatformSettings = () => {
    if (Platform.OS === 'ios') {
      void Linking.openURL('x-apple-health://');
      return;
    }
    void Linking.openSettings();
  };

  if (loadingInitial) {
    const loading = (
      <View style={variant === 'stack' ? styles.loading : [styles.root, { paddingTop: insets.insetTop }]}>
        <SkeletonList count={4} />
      </View>
    );
    return variant === 'stack' ? <StackChromeScreen>{loading}</StackChromeScreen> : loading;
  }

  const body = (
    <>
      {!connected ? (
        <HealthConnectOnboarding
          syncing={syncing}
          autoPrompting={autoPhase === 'prompting' || syncing}
          onConnect={() => void connectOrSync()}
        />
      ) : (
        <>
          <HealthSyncStatusCard
            connected={connected}
            lastSyncAt={lastSyncAt}
            syncing={syncing}
            stats={stats}
            onConnect={() => void connectOrSync()}
            onSync={() => void connectOrSync()}
            onDisconnect={revokeConnection}
          />

          {(hasData || todaySteps != null || avgSteps7d != null) && (
            <HealthActivityHero
              todaySteps={todaySteps}
              avgSteps7d={avgSteps7d}
              lastHeartRate={lastHeart}
              lastWeight={lastWeight}
            />
          )}

          <HealthInsightCards insights={insights} />
        </>
      )}

      {dashboardQ.isError && !data ? (
        <EmptyState
          title="Graphiques indisponibles"
          description="Vos données locales sont connectées, mais le serveur ne répond pas. Tirez pour rafraîchir."
          actionLabel="Réessayer"
          onAction={() => void dashboardQ.refetch()}
        />
      ) : null}

      {connected && !hasData && !dashboardQ.isError ? (
        <View style={styles.noDataHint}>
          <AppText style={styles.noDataTitle}>Aucune mesure importée</AppText>
          <AppText style={styles.noDataText}>
            Vérifiez que Cary peut lire le poids, la fréquence cardiaque et les pas dans{' '}
            {getHealthPlatformUiConfig().name}, puis synchronisez.
          </AppText>
          <AppText style={styles.link} onPress={openPlatformSettings}>
            Ouvrir {Platform.OS === 'ios' ? 'Apple Santé' : 'Health Connect'}
          </AppText>
        </View>
      ) : null}

      {hasData && !dashboardQ.isError ? (
        <>
          <View style={[styles.chartCard, elevation.xs]}>
            <AppText style={styles.sectionTitle}>Historique · 30 jours</AppText>
            <HealthMetricChart title="Pas" unit="/j" points={steps} formatValue={(v) => String(Math.round(v))} />
            <HealthMetricChart title="Fréquence cardiaque" unit="bpm" points={heart} />
            <HealthMetricChart title="Poids" unit="kg" points={weight} isLast />
          </View>

          <ActionRowCard
            title="Demander à l'assistant"
            Icon={MessageCircle}
            iconColor={c.primary}
            iconBg={c.primaryLight}
            onPress={() =>
              router.push(buildAiDeepLink('patient', { conversation_type: 'health_tracking' }) as never)
            }
            accessibilityLabel="Ouvrir l'assistant Cary"
          />
        </>
      ) : null}

      <AppText style={styles.disclaimer}>Indicatif — ne remplace pas un avis médical.</AppText>
    </>
  );

  const content = (
    <Animated.ScrollView
      {...(variant === 'stack' ? spreadTabSceneScrollProps(scrollConfig) : {})}
      style={styles.root}
      contentContainerStyle={
        variant === 'stack'
          ? scrollConfig.contentContainerStyle
          : [
              styles.scrollContent,
              { paddingTop: insets.insetTop + spacing[4], paddingBottom: insets.insetBottom + spacing[8] },
            ]
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing || syncing}
          onRefresh={onRefresh}
          progressViewOffset={variant === 'stack' ? scrollConfig.refreshProgressOffset : insets.insetTop}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {body}
    </Animated.ScrollView>
  );

  return variant === 'stack' ? <StackChromeScreen>{content}</StackChromeScreen> : content;
}

function buildStyles(c: AppColors) {
  return {
    root: {
    minWidth: 0, flex: 1, backgroundColor: c.background },
    loading: {
    minWidth: 0, flex: 1, padding: spacing[4] },
    scrollContent: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[10],
      gap: spacing[5],
    },
    sectionTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[1],
    },
    chartCard: {
      backgroundColor: c.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden' as const,
    },
    noDataHint: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 16,
      padding: spacing[4],
      gap: spacing[1.5],
    },
    noDataTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    noDataText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.5,
    },
    link: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.primary,
      marginTop: spacing[1],
    },
    disclaimer: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      textAlign: 'center' as const,
    },
  };
}
