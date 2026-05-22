import { useCallback } from 'react';
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
          colors={[colors.gradientStart, colors.gradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.gradient, fill && styles.gradientFill]}
        >
          {loading ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <View style={styles.content}>
              <Text style={styles.label} numberOfLines={1}>
                {title}
              </Text>
              <View style={styles.iconCircle}>
                <ArrowRight size={16} color={colors.textInverse} strokeWidth={2.5} />
              </View>
            </View>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    ...elevation.md,
    shadowColor: '#16B6D6',
  },
  rootFill: {
    width: '100%',
    ...elevation.md,
    shadowColor: '#16B6D6',
  },
  pressable: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  pressableFill: {
    width: '100%',
  },
  pressableDim: {
    opacity: 0.55,
  },
  gradient: {
    height: 48,
    paddingHorizontal: spacing[4],
    borderRadius: radius.lg,
    justifyContent: 'center',
  },
  gradientFill: {
    width: '100%',
    minHeight: 48,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.textInverse,
    letterSpacing: 0.15,
  },
  iconCircle: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
