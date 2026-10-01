import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { SettingsSection } from '@/components/ui/SettingsSection';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useToast } from '@/providers/ToastProvider';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { buildAiDeepLink } from '@/features/ai-hub/utils/ai-navigation';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { HealthActivityHero } from '../components/HealthActivityHero';
import { HealthConnectOnboarding } from '../components/HealthConnectOnboarding';
import { HealthInsightCards } from '../components/HealthInsightCards';
import { HealthMetricChart } from '../components/HealthMetricChart';
import { HealthSyncStatusCard } from '../components/HealthSyncStatusCard';
import { HealthSourceRevokeSheet } from '../components/HealthSourceRevokeSheet';
import { pickMetricSeries } from '../hooks/use-health-dashboard';
import { useHealthSourceConnection } from '../hooks/use-health-source-connection';
import { openDeviceHealthSettings } from '../native/health-authorization';
import { buildHealthInsights, pickLatestMetricValue } from '../utils/health-metric-stats';
import { getHealthPlatformUiConfig } from '../utils/health-platform-config';

export function HealthDataScreen() {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { show: toast } = useToast();
  const {
    dashboardQ,
    sourcesQ,
    connected,
    lastSyncAt,
    syncing,
    connectOrSync,
    revokeConnection,
    revokeSheet,
    refetchAll,
  } = useHealthSourceConnection();

  const { refreshing, onRefresh } = useManualRefresh(refetchAll);

  const data = dashboardQ.data;
  const insights = useMemo(() => buildHealthInsights(data), [data]);
  const platform = getHealthPlatformUiConfig();

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
    openDeviceHealthSettings().catch((e: unknown) => {
      console.warn('[health] ouverture des réglages impossible', e);
      toast('Ouverture impossible', { message: `Ouvrez ${platform.name} manuellement.`, type: 'error' });
    });
  };

  if (sourcesQ.isLoading && !sourcesQ.data) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <SkeletonList count={4} />
        </View>
      </StackChromeScreen>
    );
  }

  const sourcesFailed = sourcesQ.isError && !sourcesQ.data;

  return (
    <StackChromeScreen>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {sourcesFailed ? (
          <ErrorState
            title="Données santé indisponibles"
            error={sourcesQ.error}
            onRetry={() => void sourcesQ.refetch()}
          />
        ) : !connected ? (
          <HealthConnectOnboarding syncing={syncing} onConnect={() => void connectOrSync()} />
        ) : (
          <>
            <HealthSyncStatusCard
              connected={connected}
              lastSyncAt={lastSyncAt}
              syncing={syncing}
              onConnect={() => void connectOrSync()}
              onSync={() => void connectOrSync()}
              onDisconnect={revokeConnection}
            />

            {hasData || todaySteps != null || avgSteps7d != null ? (
              <HealthActivityHero
                todaySteps={todaySteps}
                avgSteps7d={avgSteps7d}
                lastHeartRate={lastHeart}
                lastWeight={lastWeight}
              />
            ) : null}

            <HealthInsightCards insights={insights} />

            {dashboardQ.isError && !data ? (
              <ErrorState
                title="Graphiques indisponibles"
                error={dashboardQ.error}
                onRetry={() => void dashboardQ.refetch()}
              />
            ) : null}

            {!hasData && !dashboardQ.isError ? (
              <View style={styles.noData}>
                <AppText variant="headline">Aucune mesure importée</AppText>
                <AppText variant="secondary">
                  Autorisez Cary à lire vos pas, votre fréquence cardiaque et votre poids dans{' '}
                  {platform.name}, puis synchronisez.
                </AppText>
                <Button title={`Ouvrir ${platform.name}`} variant="secondary" onPress={openPlatformSettings} />
              </View>
            ) : null}

            {hasData && !dashboardQ.isError ? (
              <>
                <View style={styles.chartCard}>
                  <AppText style={styles.sectionTitle} accessibilityRole="header">
                    30 derniers jours
                  </AppText>
                  <HealthMetricChart
                    title="Pas"
                    unit="pas/j"
                    points={steps}
                    formatValue={(v) => Math.round(v).toLocaleString('fr-FR')}
                  />
                  <HealthMetricChart title="Fréquence cardiaque" unit="bpm" points={heart} />
                  <HealthMetricChart title="Poids" unit="kg" points={weight} isLast />
                </View>

                <SettingsSection
                  items={[
                    {
                      icon: MessageCircle,
                      label: "Demander à l'assistant",
                      accessibilityHint: "Ouvre l'assistant Cary",
                      onPress: () =>
                        router.push(buildAiDeepLink('patient', { conversation_type: 'health_tracking' })),
                    },
                  ]}
                />
              </>
            ) : null}
          </>
        )}

        <AppText variant="caption" style={styles.disclaimer}>
          Indicatif — ne remplace pas un avis médical.
        </AppText>
      </ScrollView>
      <HealthSourceRevokeSheet {...revokeSheet} />
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    root: { minWidth: 0, flex: 1, backgroundColor: c.background },
    loading: { minWidth: 0, flex: 1, padding: spacing[4] },
    scrollContent: {
      paddingTop: spacing[4],
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[10],
      gap: spacing[5],
    },
    sectionTitle: {
      ...text.caption,
      ...font.semiBold,
      color: c.textSecondary,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[1],
    },
    chartCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    noData: { gap: spacing[2], alignItems: 'flex-start' as const },
    disclaimer: { textAlign: 'center' as const, color: c.textTertiary },
  };
}
