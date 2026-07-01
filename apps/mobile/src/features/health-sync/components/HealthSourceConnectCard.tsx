import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { ActivityIndicator, Platform, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, ChevronRight, HeartPulse } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import {
  formatHealthSyncRelative,
  getHealthPlatformUiConfig,
} from '../utils/health-platform-config';

interface Props {
  connected: boolean;
  lastSyncAt?: string | null;
  syncing?: boolean;
  onPress: () => void;
  /** Version plus compacte pour le récap carnet. */
  compact?: boolean;
}

export function HealthSourceConnectCard({
  connected,
  lastSyncAt,
  syncing = false,
  onPress,
  compact = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'HealthSourceConnectCard');
  const platform = getHealthPlatformUiConfig();

  const title = connected ? platform.name : platform.connectTitle;
  const subtitle = connected
    ? `${formatHealthSyncRelative(lastSyncAt)} · ${platform.connectedSubtitle}`
  : platform.disconnectedSubtitle;

  return (
    <Pressable
      onPress={() => {
        if (syncing) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={syncing}
      accessibilityRole="button"
      accessibilityLabel={
        connected
          ? `${platform.name}, connecté. ${formatHealthSyncRelative(lastSyncAt)}. Mettre à jour.`
          : platform.connectTitle
      }
      style={({ pressed }) => [
        styles.card,
        compact && styles.cardCompact,
        pressed && !syncing && styles.cardPressed,
      ]}
    >
      <Row gap={spacing[3]} align="center">
        <View style={[styles.iconWrap, { backgroundColor: platform.iconBg }]}>
          <HeartPulse size={compact ? 18 : 20} color={platform.iconColor} strokeWidth={2.25} />
        </View>

        <View style={styles.textCol}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={compact ? 2 : 3}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.trailing}>
          {syncing ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : connected ? (
            <CheckCircle2 size={20} color={c.success} strokeWidth={2.25} />
          ) : (
            <ChevronRight size={18} color={c.textTertiary} strokeWidth={2} />
          )}
        </View>
      </Row>
    </Pressable>
  );
}

function buildStyles(c: AppColors) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3.5],
      ...Platform.select({
        ios: { borderCurve: 'continuous' as const },
        default: {},
      }),
      ...elevation.xs,
    },
    cardCompact: {
      paddingVertical: spacing[3],
    },
    cardPressed: {
      opacity: 0.92,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    textCol: {
      flex: 1,
      minWidth: 0,
      gap: spacing[0.5],
    },
    title: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
      letterSpacing: -0.2,
    },
    titleCompact: {
      fontSize: fontSize.sm,
    },
    subtitle: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      lineHeight: fontSize.xs * 1.5,
    },
    trailing: {
      width: 24,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
  };
}
