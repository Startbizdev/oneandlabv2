import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Row } from '@/components/layout/primitives';
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
  /** `wizard` : pill + 2 lignes. `list` : une ligne, coins modérés (liste RDV). */
  variant?: 'wizard' | 'list';
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
  variant = 'wizard',
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_BookingPremiumStepCta_tsx_styles');
  const isList = variant === 'list';
  const cornerRadius = isList ? radius.lg : radius.full;
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

  const a11yLabel = isList || !subtitle ? title : `${title}. ${subtitle}`;

  return (
    <Animated.View style={[styles.root, isList && styles.rootList, animatedStyle, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={({ pressed }) => [
          styles.hit,
          { borderRadius: cornerRadius },
          (pressed || disabled) && !loading && styles.hitDim,
        ]}
      >
        <LinearGradient
          colors={[c.gradientStart, c.gradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[
            styles.gradient,
            { borderRadius: cornerRadius },
            isList && styles.gradientList,
            badgeValue == null && !leadingIcon && styles.gradientNoBadge,
          ]}
        >
          <Row gap={isList ? spacing[2.5] : spacing[3]} align="center">
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
            <View
              style={[
                styles.stepBadge,
                isList && styles.stepBadgeList,
                loading && styles.leadingMuted,
              ]}
            >
              {leadingIcon}
            </View>
          ) : null}

          <View style={styles.copy}>
            <Text style={[styles.title, isList && styles.titleList]} numberOfLines={1}>
              {title}
            </Text>
            {!isList && subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={[styles.arrowOrb, isList && styles.arrowOrbList]}>
            {loading ? (
              <ActivityIndicator color={c.textInverse} size="small" />
            ) : (
              <ArrowRight
                size={isList ? 18 : 20}
                color={c.textInverse}
                strokeWidth={2.5}
              />
            )}
          </View>
          </Row>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const STEP_BADGE = 40;
const ARROW_ORB = 44;
const LIST_ORB = 36;

function buildStyles(c: AppColors) {
  return {
  root: {
    width: '100%' as const,
    ...elevation.lg,
    shadowColor: c.gradientEnd,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  rootList: {
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  hit: {
    overflow: 'hidden' as const,
  },
  hitDim: {
    opacity: 0.6,
  },
  leadingMuted: {
    opacity: 0.75,
  },
  gradient: {
    minWidth: 0,
    minHeight: 56,
    paddingVertical: spacing[3],
    paddingLeft: spacing[2.5],
    paddingRight: spacing[2],
  },
  gradientList: {
    minHeight: 52,
    paddingVertical: spacing[2.5],
  },
  gradientNoBadge: {
    paddingLeft: spacing[4],
  },
  stepBadge: {
    width: STEP_BADGE,
    height: STEP_BADGE,
    borderRadius: radius.full,
    backgroundColor: c.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
    overflow: 'hidden' as const,
  },
  stepBadgeList: {
    width: LIST_ORB,
    height: LIST_ORB,
    borderRadius: radius.md,
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
    justifyContent: 'center' as const,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: c.textInverse,
    letterSpacing: -0.15,
  },
  titleList: {
    fontSize: fontSize.base,
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
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
    overflow: 'hidden' as const,
  },
  arrowOrbList: {
    width: LIST_ORB,
    height: LIST_ORB,
    borderRadius: radius.md,
  },
};
}

