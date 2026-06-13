import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback } from 'react';
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

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** Remplit l'espace horizontal restant dans la barre d'action. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function BookingContinueButton({
  title,
  onPress,
  loading,
  disabled,
  fill,
  style,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_BookingContinueButton_tsx_BookingContinueButton_styles');

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    scale.value = withSpring(0.97, animation.spring.snappy);
  }, [disabled, loading, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animation.spring.bouncy);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    runOnJS(triggerHaptic)();
    onPress();
  }, [disabled, loading, onPress]);

  return (
    <Animated.View
      style={[
        fill ? styles.rootFill : styles.root,
        animatedStyle,
        style,
      ]}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => [
          styles.pressable,
          fill && styles.pressableFill,
          (pressed || disabled) && styles.pressableDim,
        ]}
      >
        <LinearGradient
          colors={[c.gradientStart, c.gradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.gradient, fill && styles.gradientFill]}
        >
          {loading ? (
            <ActivityIndicator color={c.textInverse} size="small" />
          ) : (
            <Row gap={spacing[2]} justify="center">
              <Text style={styles.label} numberOfLines={1}>
                {title}
              </Text>
              <View style={styles.iconCircle}>
                <ArrowRight size={18} color={c.textInverse} strokeWidth={2.5} />
              </View>
            </Row>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function buildStyles(c: AppColors) {
  return {
  root: {
    alignSelf: 'stretch' as const,
    ...elevation.md,
    shadowColor: '#16B6D6',
  },
  rootFill: {
    width: '100%' as const,
    ...elevation.md,
    shadowColor: '#16B6D6',
  },
  pressable: {
    borderRadius: radius.lg,
    overflow: 'hidden' as const,
  },
  pressableFill: {
    width: '100%' as const,
  },
  pressableDim: {
    opacity: 0.55,
  },
  gradient: {
    minHeight: 52,
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    justifyContent: 'center' as const,
  },
  gradientFill: {
    width: '100%' as const,
    minHeight: 52,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textInverse,
    letterSpacing: 0.15,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
}
