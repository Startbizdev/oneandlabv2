import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useCallback, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ArrowRight } from 'lucide-react-native';
import { animation, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export interface BookingPremiumStepCtaProps {
  /** Numéro d’étape dans le badge blanc (si pas de `selectionCount`). */
  step?: number;
  /** Nombre de soins sélectionnés — affiché dans le badge à la place du numéro d’étape. */
  selectionCount?: number;
  showStepBadge?: boolean;
  /** Icône dans le cercle blanc (ex. calendrier liste RDV). */
  leadingIcon?: ReactNode;
  title?: string;
  subtitle?: string;
  onPress: () => void;
  /** Tap sur le badge compteur (ex. ouvrir le détail du panier). */
  onSelectionBadgePress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_TITLE = 'Valider la sélection';
const DEFAULT_SUBTITLE = 'Passer à l’étape suivante';

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function BookingPremiumStepCta({
  step = 1,
  selectionCount,
  showStepBadge = true,
  leadingIcon,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  onPress,
  onSelectionBadgePress,
  loading,
  disabled,
  style,
}: BookingPremiumStepCtaProps) {
  const badgeValue =
    selectionCount != null && selectionCount > 0
      ? selectionCount > 99
        ? '99+'
        : String(selectionCount)
      : showStepBadge
        ? String(step)
        : null;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    scale.value = withSpring(0.98, animation.spring.snappy);
  }, [disabled, loading, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animation.spring.bouncy);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    runOnJS(triggerHaptic)();
    onPress();
  }, [disabled, loading, onPress]);

  const a11yLabel = `${title}. ${subtitle}`;

  return (
    <Animated.View style={[styles.root, animatedStyle, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={({ pressed }) => [
          styles.hit,
          (pressed || disabled) && !loading && styles.hitDim,
        ]}
      >
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[
            styles.gradient,
            badgeValue == null && !leadingIcon && styles.gradientNoBadge,
          ]}
        >
          {badgeValue != null ? (
            onSelectionBadgePress ? (
              <Pressable
                onPress={onSelectionBadgePress}
                disabled={disabled || loading}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Voir le détail des soins sélectionnés"
                style={({ pressed }) => [pressed && styles.badgePressed]}
              >
                <View style={[styles.stepBadge, loading && styles.leadingMuted]}>
                  <Text style={styles.stepNum}>{badgeValue}</Text>
                </View>
              </Pressable>
            ) : (
              <View style={[styles.stepBadge, loading && styles.leadingMuted]}>
                <Text style={styles.stepNum}>{badgeValue}</Text>
              </View>
            )
          ) : leadingIcon ? (
            <View style={[styles.stepBadge, loading && styles.leadingMuted]}>{leadingIcon}</View>
          ) : null}

          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>

          <View style={styles.arrowOrb}>
            {loading ? (
              <ActivityIndicator color={colors.textInverse} size="small" />
            ) : (
              <ArrowRight size={20} color={colors.textInverse} strokeWidth={2.5} />
            )}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const STEP_BADGE = 40;
const ARROW_ORB = 44;

function buildStyles(c: AppColors) {
  return {
  root: {
    width: '100%',
    ...elevation.lg,
    shadowColor: c.gradientEnd,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  hit: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  hitDim: {
    opacity: 0.6,
  },
  leadingMuted: {
    opacity: 0.75,
  },
  gradient: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingLeft: spacing[2.5],
    paddingRight: spacing[2],
    gap: spacing[3],
    borderRadius: radius.full,
  },
  gradientNoBadge: {
    paddingLeft: spacing[4],
  },
  stepBadge: {
    width: STEP_BADGE,
    height: STEP_BADGE,
    borderRadius: STEP_BADGE / 2,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgePressed: {
    opacity: 0.88,
  },
  stepNum: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize.lg,
    color: c.primary,
    letterSpacing: -0.5,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: c.textInverse,
    letterSpacing: -0.15,
  },
  subtitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.1,
  },
  arrowOrb: {
    width: ARROW_ORB,
    height: ARROW_ORB,
    borderRadius: ARROW_ORB / 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_form_components_BookingPremiumStepCta_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
