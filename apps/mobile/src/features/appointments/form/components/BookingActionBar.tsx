import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingPremiumStepCta } from './BookingPremiumStepCta';
import { colors, elevation, spacing } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
  onPrimary: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
}

/** Footer sticky — même CTA premium que l’étape 1 (sans badge numéro), sans animation. */
export function BookingActionBar({
  title,
  subtitle,
  onPrimary,
  primaryLoading,
  primaryDisabled,
}: Props) {
  const { bottom } = useSafeAreaInsets();
  const bottomPad = Math.max(bottom, spacing[2]);

  const content = (
    <View style={[styles.bar, { paddingBottom: bottomPad }]}>
      <BookingPremiumStepCta
        showStepBadge={false}
        title={title}
        subtitle={subtitle}
        onPress={onPrimary}
        loading={primaryLoading}
        disabled={primaryDisabled}
      />
    </View>
  );

  return (
    <View style={styles.shell}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={72} tint="light" style={styles.blur}>
          <View style={styles.blurOverlay}>{content}</View>
        </BlurView>
      ) : (
        <View style={styles.androidBar}>{content}</View>
      )}
    </View>
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
    backgroundColor: 'rgba(247, 244, 239, 0.9)',
  },
  androidBar: {
    backgroundColor: colors.bookingCanvasLight,
  },
  bar: {
    paddingTop: spacing[3],
    paddingHorizontal: spacing[4],
  },
});
