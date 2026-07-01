import type { AppColors } from '@/theme/colors';
import { palette } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Platform, Pressable, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowRight, HeartPulse } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Skeleton } from '@/components/ui/skeletons';
import { elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { HealthRecordProgressRing } from './HealthRecordProgressRing';
import { healthRecordHeroSubtitle } from '../utils/health-record-display';

const CARNET_GRADIENT = [palette.green[500], palette.green[700]] as const;
const CARNET_CARD_RADIUS = radius['2xl'];

interface Props {
  percent: number;
  onPress: () => void;
  loading?: boolean;
}

export function HealthRecordPromptCard({ percent, onPress, loading }: Props) {
  const styles = useThemedStyles(buildStyles, 'HealthRecordPromptCard');
  const subtitle = healthRecordHeroSubtitle(percent);

  if (loading) {
    return (
      <View style={[styles.shell, styles.loadingShell]}>
        <Row gap={spacing[3]} align="center">
          <Skeleton width={56} height={56} borderRadius={radius.full} />
          <View style={styles.loadingBody}>
            <Skeleton width="68%" height={16} />
            <Skeleton width="52%" height={14} style={styles.loadingLine} />
          </View>
        </Row>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(320).springify()} style={styles.outer}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        accessibilityRole="button"
        accessibilityLabel="Compléter mon carnet de santé"
        style={({ pressed }) => [styles.shell, pressed && styles.pressed]}
      >
        <LinearGradient
          colors={[...CARNET_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.glowOrb} pointerEvents="none" />
          <View style={styles.glowOrbSecondary} pointerEvents="none" />

          <Row gap={spacing[3]} align="center">
            <View style={styles.ringWrap}>
              <HealthRecordProgressRing percent={percent} size={56} strokeWidth={5} tone="onGradient" />
            </View>

            <View style={styles.body}>
              <Row gap={spacing[1.5]} align="center">
                <HeartPulse size={15} color="#FFFFFF" strokeWidth={2.25} />
                <Text style={styles.title}>Mon carnet de santé</Text>
              </Row>
              <Text style={styles.subtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            </View>

            <View style={styles.chevronWrap}>
              <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.25} />
            </View>
          </Row>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function buildStyles(_c: AppColors) {
  const cardRadius = Platform.select({
    ios: { borderCurve: 'continuous' as const },
    default: {},
  });

  return {
    outer: {
      ...elevation.sm,
      borderRadius: CARNET_CARD_RADIUS,
      ...cardRadius,
    },
    pressed: { opacity: 0.94, transform: [{ scale: 0.992 }] },
    shell: {
      borderRadius: CARNET_CARD_RADIUS,
      overflow: 'hidden' as const,
      ...cardRadius,
    },
    loadingShell: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3.5],
      backgroundColor: _c.surface,
      borderRadius: CARNET_CARD_RADIUS,
      borderWidth: 1,
      borderColor: _c.borderLight,
      ...cardRadius,
    },
    loadingBody: { flex: 1, minWidth: 0, gap: spacing[2] },
    loadingLine: { marginTop: spacing[1] },
    gradient: {
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3.5],
      position: 'relative' as const,
      borderRadius: CARNET_CARD_RADIUS,
      overflow: 'hidden' as const,
      ...cardRadius,
    },
    glowOrb: {
      position: 'absolute' as const,
      width: 120,
      height: 120,
      borderRadius: 60,
      top: -36,
      right: -24,
      backgroundColor: hexToRgba('#FFFFFF', 0.16),
    },
    glowOrbSecondary: {
      position: 'absolute' as const,
      width: 72,
      height: 72,
      borderRadius: 36,
      bottom: -28,
      left: 24,
      backgroundColor: hexToRgba('#FFFFFF', 0.08),
    },
    ringWrap: {
      width: 56,
      height: 56,
      borderRadius: radius.full,
      backgroundColor: hexToRgba('#FFFFFF', 0.18),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    body: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    title: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.base,
      color: '#FFFFFF',
      letterSpacing: -0.2,
    },
    subtitle: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: hexToRgba('#FFFFFF', 0.88),
      lineHeight: fontSize.sm * 1.4,
    },
    chevronWrap: {
      width: 32,
      height: 32,
      borderRadius: radius.full,
      backgroundColor: hexToRgba('#FFFFFF', 0.2),
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  };
}
