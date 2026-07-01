import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useRouter } from 'expo-router';
import { Platform, RefreshControl, Text, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { MessageCircle } from 'lucide-react-native';
import { ActionRowCard } from '@/components/ui/ActionRowCard';
import { SkeletonList } from '@/components/ui/skeletons';
import { useTabSceneInsets } from '@/components/navigation/liquid-glass-header-inset';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackContentTopInset, useStackScrollConfig, STACK_SCENE_CONTENT_TOP_GAP } from '@/navigation/use-stack-scroll-config';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { buildAiDeepLink } from '@/features/ai-hub/utils/ai-navigation';
import { HealthDataEmptyPanel } from '../components/HealthDataEmptyPanel';
import { HealthMetricChart } from '../components/HealthMetricChart';
import { HealthSourceConnectCard } from '../components/HealthSourceConnectCard';
import { revokeHealthSource } from '../api/health.service';
import { pickMetricSeries } from '../hooks/use-health-dashboard';
import { useHealthSourceConnection } from '../hooks/use-health-source-connection';
import { useToast } from '@/providers/ToastProvider';
import { useEffect, useMemo, useState } from 'react';
import { fetchAiTrends } from '@/features/ai-hub/api/ai.service';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';

interface Props {
  variant?: 'tab' | 'stack';
}

export function HealthDataScreen({ variant = 'stack' }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_health_sync_HealthDataScreen_styles');
  const c = useAppColors();
  const router = useRouter();
  const { show: toast } = useToast();
  const insets = useTabSceneInsets();
  const contentTopInset = useStackContentTopInset();
  const { height: windowHeight } = useWindowDimensions();
  const scrollConfig = useStackScrollConfig(styles.scrollContent, {
    extraTop: STACK_SCENE_CONTENT_TOP_GAP,
  });
  const connection = useHealthSourceConnection();
  const { dashboardQ, sourcesQ, connected, lastSyncAt, syncing, connectOrSync, primarySource } =
    connection;
  const [trends, setTrends] = useState<Array<{ observation_fr: string }>>([]);
  const { refreshing, onRefresh } = useManualRefresh(async () => {
    await connectOrSync();
  });

  const data = dashboardQ.data;

  useEffect(() => {
    if (!data?.summary?.has_data) return;
    void fetchAiTrends(true)
      .then(setTrends)
      .catch(() => setTrends([]));
  }, [data?.summary?.has_data]);

  const weight = pickMetricSeries(data, 'weight');
  const heart = pickMetricSeries(data, 'heart_rate');
  const steps = pickMetricSeries(data, 'steps');
  const summary7 = data?.summary?.windows?.['7d']?.metrics;
  const hasData = data?.summary?.has_data;

  const chips = useMemo(() => {
    const items: string[] = [];
    trends.forEach((t) => items.push(t.observation_fr));
    if (summary7?.steps) items.push(`~${Math.round(summary7.steps.avg)} pas/j`);
    if (summary7?.weight && summary7.weight.sample_count >= 2) {
      items.push(`${summary7.weight.min}–${summary7.weight.max} kg`);
    }
    return items;
  }, [summary7, trends]);

  if (dashboardQ.isLoading && !data) {
    const loading = (
      <View style={variant === 'stack' ? styles.loading : [styles.root, { paddingTop: insets.insetTop }]}>
        <SkeletonList count={4} />
      </View>
    );
    return variant === 'stack' ? <StackChromeScreen>{loading}</StackChromeScreen> : loading;
  }

  const emptyContainerStyle = useMemo(
    () => ({
      minHeight: windowHeight,
      paddingTop: contentTopInset,
      paddingBottom: contentTopInset,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing[4],
    }),
    [contentTopInset, windowHeight],
  );

  const handleRevoke = () => {
    if (!primarySource) return;
    void (async () => {
      try {
        await revokeHealthSource(primarySource.id);
        await sourcesQ.refetch();
        await dashboardQ.refetch();
        toast('Accès révoqué', { type: 'success' });
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Révocation impossible', { type: 'error' });
      }
    })();
  };

  const emptyBody = (
    <HealthDataEmptyPanel
      connected={connected}
      syncing={syncing}
      onConnect={() => void connectOrSync()}
      onRevoke={connected ? handleRevoke : undefined}
    />
  );

  const dataBody = (
    <>
      <HealthSourceConnectCard
        connected={connected}
        lastSyncAt={lastSyncAt}
        syncing={syncing}
        onPress={() => void connectOrSync()}
        compact
      />

      {chips.length > 0 ? (
        <View style={styles.chipRow}>
          {chips.map((label) => (
            <View key={label} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.chartCard, elevation.xs]}>
        <HealthMetricChart title="Poids" unit="kg" points={weight} />
        <HealthMetricChart title="Fréquence cardiaque" unit="bpm" points={heart} />
        <HealthMetricChart
          title="Pas"
          unit="/j"
          points={steps}
          formatValue={(v) => String(Math.round(v))}
          isLast
        />
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

      <Text style={styles.disclaimer}>Données indicatives — sans diagnostic médical.</Text>
    </>
  );

  if (variant === 'stack') {
    if (!hasData) {
      return (
        <StackChromeScreen>
          <Animated.ScrollView
            style={styles.root}
            contentContainerStyle={emptyContainerStyle}
            refreshControl={
              <RefreshControl
                refreshing={refreshing || syncing}
                onRefresh={onRefresh}
                progressViewOffset={insets.insetTop}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {emptyBody}
          </Animated.ScrollView>
        </StackChromeScreen>
      );
    }

    return (
      <StackChromeScreen>
        <Animated.ScrollView
          {...spreadTabSceneScrollProps(scrollConfig)}
          style={styles.root}
          contentContainerStyle={scrollConfig.contentContainerStyle}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || syncing}
              onRefresh={onRefresh}
              progressViewOffset={scrollConfig.refreshProgressOffset}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {dataBody}
        </Animated.ScrollView>
      </StackChromeScreen>
    );
  }

  return (
    <Animated.ScrollView
      style={styles.root}
      contentContainerStyle={
        hasData
          ? [
              styles.scrollContent,
              { paddingTop: insets.insetTop + spacing[4], paddingBottom: insets.insetBottom + spacing[8] },
            ]
          : emptyContainerStyle
      }
      refreshControl={<RefreshControl refreshing={refreshing || syncing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {hasData ? dataBody : emptyBody}
    </Animated.ScrollView>
  );
}

function buildStyles(c: AppColors) {
  return {
    root: { flex: 1, backgroundColor: c.background },
    loading: { flex: 1, padding: spacing[4] },
    scrollContent: {
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[10],
      gap: spacing[5],
    },
    chipRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[2],
    },
    chip: {
      backgroundColor: c.surface,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: c.borderLight,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[1.5],
    },
    chipText: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    chartCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden' as const,
      ...Platform.select({
        ios: { borderCurve: 'continuous' as const },
        default: {},
      }),
    },
    disclaimer: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      textAlign: 'center' as const,
      marginTop: spacing[1],
    },
  };
}
