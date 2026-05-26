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
import { animation, colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export interface BookingPremiumStepCtaProps {
  /** Numéro d’étape dans le badge blanc (étape 1 uniquement). */
  step?: number;
  showStepBadge?: boolean;
  /** Icône dans le cercle blanc (ex. calendrier liste RDV). */
  leadingIcon?: ReactNode;
  title?: string;
  subtitle?: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_TITLE = 'Valider la sélection';
const DEFAULT_SUBTITLE = 'PASSER À L’ÉTAPE SUIVANTE';

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function BookingPremiumStepCta({
  step = 1,
  showStepBadge = true,
  leadingIcon,
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  onPress,
  loading,
  disabled,
  style,
}: BookingPremiumStepCtaProps) {
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
            !showStepBadge && !leadingIcon && styles.gradientNoBadge,
          ]}
        >
          {showStepBadge ? (
            <View style={[styles.stepBadge, loading && styles.leadingMuted]}>
              <Text style={styles.stepNum}>{step}</Text>
            </View>
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

const styles = StyleSheet.create({
  root: {
    width: '100%',
    ...elevation.lg,
    shadowColor: colors.gradientEnd,
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
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2.5],
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
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNum: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize.lg,
    color: colors.primary,
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
    fontSize: fontSize.sm,
    color: colors.textInverse,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: 'rgba(255,255,255,0.88)',
    letterSpacing: 0.55,
    textTransform: 'uppercase',
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
});
