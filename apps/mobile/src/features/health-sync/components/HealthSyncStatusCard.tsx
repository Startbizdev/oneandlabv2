import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Activity, CheckCircle2, HeartPulse, RefreshCw, Unplug } from 'lucide-react-native';
import { Row, Stack } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';
import {
  formatHealthSyncRelative,
  getHealthPlatformUiConfig,
} from '../utils/health-platform-config';
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
  const styles = useStyles(buildStyles);
  const platform = getHealthPlatformUiConfig();

  const withHaptic = (action: () => void) => () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Row gap={spacing[3]} align="start">
        <View style={[styles.iconWrap, { backgroundColor: platform.iconBg }]}>
          <HeartPulse size={iconSize.md} color={platform.iconColor} strokeWidth={ICON_STROKE_WIDTH} />
        </View>

        <Stack gap={spacing[2]} style={styles.body}>
          <Row gap={spacing[2]} align="center" style={styles.titleRow}>
            <AppText style={styles.title}>{platform.name}</AppText>
            {connected ? (
              <Row gap={spacing[1]} align="center">
                <CheckCircle2 size={iconSize.xs} color={c.success} strokeWidth={ICON_STROKE_WIDTH} />
                <AppText style={styles.connectedText}>Connecté</AppText>
              </Row>
            ) : null}
          </Row>

          <AppText variant="caption">
            {connected
              ? `${formatHealthSyncRelative(lastSyncAt)} · ${platform.connectedSubtitle}`
              : platform.disconnectedSubtitle}
          </AppText>

          {connected && stats.length > 0 ? (
            <Row gap={spacing[2]} style={styles.statsRow}>
              {stats.slice(0, 3).map((stat) => (
                <View key={stat.type} style={styles.statTile}>
                  <AppText variant="caption">{stat.label}</AppText>
                  <AppText style={styles.statValue}>
                    {stat.value}
                    <AppText style={styles.statUnit}> {stat.unit}</AppText>
                  </AppText>
                  {stat.hint ? <AppText variant="caption">{stat.hint}</AppText> : null}
                </View>
              ))}
            </Row>
          ) : null}

          <Row gap={spacing[2]} align="center">
            {connected ? (
              <>
                <View style={styles.actionFlex}>
                  <Button
                    title="Synchroniser"
                    size="sm"
                    fullWidth
                    loading={syncing}
                    leftIcon={
                      syncing ? undefined : (
                        <RefreshCw size={iconSize.sm} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                      )
                    }
                    onPress={withHaptic(onSync ?? onConnect)}
                  />
                </View>
                {onDisconnect ? (
                  <IconActionButton
                    label={`Déconnecter ${platform.name}`}
                    variant="muted"
                    disabled={syncing}
                    onPress={withHaptic(onDisconnect)}
                  >
                    <Unplug size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
                  </IconActionButton>
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
                    syncing ? undefined : (
                      <Activity size={iconSize.sm} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                    )
                  }
                  onPress={withHaptic(onConnect)}
                />
              </View>
            )}
          </Row>
        </Stack>
      </Row>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      padding: spacing[4],
    },
    cardCompact: {
      padding: spacing[3],
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
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
      flexShrink: 1,
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    connectedText: {
      ...font.semiBold,
      fontSize: fontSize.xs,
      color: c.success,
    },
    statsRow: {
      flexWrap: 'wrap' as const,
    },
    statTile: {
      flex: 1,
      minWidth: 88,
      borderRadius: radius.md,
      backgroundColor: c.surfaceAlt,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      gap: spacing[0.5],
    },
    statValue: {
      ...font.heading,
      fontSize: fontSize.lg,
      color: c.textPrimary,
    },
    statUnit: {
      ...font.medium,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
    actionFlex: {
      flex: 1,
      minWidth: 0,
    },
  };
}
