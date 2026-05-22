import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingContinueButton } from './BookingContinueButton';
import { BookingSelectionCart } from './BookingSelectionCart';
import { colors, elevation, spacing } from '@/theme';

interface CartProps {
  count: number;
  onPressDetail: () => void;
}

interface Props {
  primaryLabel: string;
  onPrimary: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  cart?: CartProps;
}

/** Footer sticky : panier compact à gauche, CTA gradient qui remplit le reste. */
export function BookingActionBar({
  primaryLabel,
  onPrimary,
  primaryLoading,
  primaryDisabled,
  cart,
}: Props) {
  const { bottom } = useSafeAreaInsets();
  const bottomPad = Math.max(bottom, spacing[2]);

  const content = (
    <View style={[styles.bar, { paddingBottom: bottomPad }]}>
      {cart ? (
        <BookingSelectionCart count={cart.count} onPress={cart.onPressDetail} />
      ) : null}
      <View style={styles.ctaWrap}>
        <BookingContinueButton
          title={primaryLabel}
          onPress={onPrimary}
          loading={primaryLoading}
          disabled={primaryDisabled}
          fill
        />
      </View>
    </View>
  );

  return (
    <Animated.View entering={FadeInUp.duration(240).springify()} style={styles.shell}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={72} tint="light" style={styles.blur}>
          <View style={styles.blurOverlay}>{content}</View>
        </BlurView>
      ) : (
        <View style={styles.androidBar}>{content}</View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    ...elevation.lg,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  blur: {
    overflow: 'hidden',
  },
  blurOverlay: {
    backgroundColor: 'rgba(255,255,255,0.84)',
  },
  androidBar: {
    backgroundColor: colors.surface,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingTop: spacing[3],
    paddingHorizontal: spacing[4],
  },
  ctaWrap: {
    flex: 1,
    minWidth: 120,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
});
