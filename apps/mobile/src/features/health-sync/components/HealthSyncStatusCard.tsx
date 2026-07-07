import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { ActivityIndicator, Platform, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Activity, CheckCircle2, HeartPulse, RefreshCw, Unplug } from 'lucide-react-native';
import { Row, Stack } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';
import {
  formatHealthSyncRelative,
  getHealthPlatformUiConfig,
} from '../utils/health-platform-config';
import { layoutRowCenter } from '@/theme/layout-styles';
import type { HealthMetricStat } from '../utils/health-metric-stats';

interface Props {
  connected: boolean;
  lastSyncAt?: string | null;
  syncing?: boolean;
  stats?: HealthMetricStat[];
  onConnect: () => void;
  onSync?: () => void;
  onDisconnect?: () => void;
  /** Affichage compact dans le carnet. */
  compact?: boolean;
}

export function HealthSyncStatusCard({
  connected,
  lastSyncAt,
  syncing = false,
  stats = [],
  onConnect,
  onSync,
  onDisconnect,
  compact = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const platform = getHealthPlatformUiConfig();

  return (
    <View
      style={[
        styles.card,
        compact && styles.cardCompact,
        connected && { borderColor: hexToRgba(c.success, 0.35), backgroundColor: hexToRgba(c.success, 0.04) },
      ]}
    >
      <Row gap={spacing[3]} align="start">
        <View style={[styles.iconWrap, { backgroundColor: platform.iconBg }]}>
          <HeartPulse size={compact ? 18 : 22} color={platform.iconColor} strokeWidth={2.25} />
        </View>

        <Stack gap={spacing[2]} style={styles.body}>
          <Row gap={spacing[2]} align="center" style={styles.titleRow}>
            <AppText style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
              {platform.name}
            </AppText>
            {connected ? (
              <View style={[styles.badge, { backgroundColor: hexToRgba(c.success, 0.14) }]}>
                <CheckCircle2 size={iconSize['2xs']} color={c.success} strokeWidth={2.5} />
                <AppText style={[styles.badgeText, { color: c.success }]}>Connecté</AppText>
              </View>
            ) : null}
          </Row>

          <AppText style={styles.subtitle}>
            {connected
              ? `${formatHealthSyncRelative(lastSyncAt)} · ${platform.connectedSubtitle}`
              : platform.disconnectedSubtitle}
          </AppText>

          {connected && stats.length > 0 ? (
            <Row gap={spacing[2]} style={styles.statsRow}>
              {stats.slice(0, 3).map((stat) => (
                <View key={stat.type} style={[styles.statTile, { backgroundColor: c.surface }]}>
                  <AppText style={styles.statLabel} numberOfLines={1}>
                    {stat.label}
                  </AppText>
                  <AppText style={styles.statValue}>
                    {stat.value}
                    <AppText style={styles.statUnit}> {stat.unit}</AppText>
                  </AppText>
                  {stat.hint ? (
                    <AppText style={styles.statHint} numberOfLines={1}>
                      {stat.hint}
                    </AppText>
                  ) : null}
                </View>
              ))}
            </Row>
          ) : null}

          <Row gap={spacing[2]} style={styles.actions}>
            {connected ? (
              <>
                <View style={styles.actionFlex}>
                  <Button
                    title="Synchroniser"
                    size="sm"
                    fullWidth
                    loading={syncing}
                    leftIcon={
                      syncing ? undefined : <RefreshCw size={iconSize.xs} color="#FFFFFF" strokeWidth={2.5} />
                    }
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      (onSync ?? onConnect)();
                    }}
                  />
                </View>
                {onDisconnect ? (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onDisconnect();
                    }}
                    disabled={syncing}
                    accessibilityRole="button"
                    accessibilityLabel={`Déconnecter ${platform.name}`}
                    style={({ pressed }) => [
                      styles.disconnectBtn,
                      { borderColor: c.borderLight, backgroundColor: c.surface },
                      pressed && styles.disconnectBtnPressed,
                    ]}
                  >
                    {syncing ? (
                      <ActivityIndicator size="small" color={c.textTertiary} />
                    ) : (
                      <Unplug size={iconSize.sm} color={c.textSecondary} strokeWidth={2.25} />
                    )}
                  </Pressable>
                ) : null}
              </>
            ) : (
              <View style={styles.actionFlex}>
                <Button
                  title={platform.connectTitle}
                  size="sm"
                  fullWidth
                  loading={syncing}
                  leftIcon={
                    syncing ? undefined : <Activity size={iconSize.xs} color="#FFFFFF" strokeWidth={2.5} />
                  }
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onConnect();
                  }}
                />
              </View>
            )}
          </Row>
        </Stack>
      </Row>
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
      ...Platform.select({
        ios: { borderCurve: 'continuous' as const },
        default: {},
      }),
      ...elevation.xs,
    },
    cardCompact: {
      padding: spacing[3.5],
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: radius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    titleRow: {
      flexWrap: 'wrap' as const,
    },
    title: {
      minWidth: 0,
      fontFamily: fontFamily.bold,
      fontSize: fontSize.base,
      color: c.textPrimary,
      letterSpacing: -0.2,
      flexShrink: 1,
    },
    titleCompact: {
      fontSize: fontSize.sm,
    },
    badge: {
      ...layoutRowCenter(spacing[1]),
      paddingHorizontal: spacing[2],
      paddingVertical: spacing[0.5],
      borderRadius: radius.full,
    },
    badgeText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
    },
    subtitle: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: fontSize.xs * 1.55,
    },
    statsRow: {
      flexWrap: 'wrap' as const,
    },
    statTile: {
      flex: 1,
      minWidth: 88,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[2],
      gap: spacing[0.5],
    },
    statLabel: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize['2xs'],
      color: c.textTertiary,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.4,
    },
    statValue: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.lg,
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    statUnit: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
    statHint: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize['2xs'],
      color: c.textTertiary,
    },
    actions: {
      alignItems: 'center' as const,
    },
    actionFlex: {
      flex: 1,
      minWidth: 0,
    },
    disconnectBtn: {
      width: 40,
      height: 40,
      borderRadius: radius.lg,
      borderWidth: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    disconnectBtnPressed: {
      opacity: 0.85,
    },
  };
}
