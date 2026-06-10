import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppColors } from '@/theme/use-app-colors';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  message: string;
  compact?: boolean;
  onPress?: () => void;
}

/** Alerte avis publié — même pattern que RdvCancellationBanner. */
export function RdvPublishedReviewBanner({ message, compact, onPress }: Props) {
  const c = useAppColors();

  const banner = (
    <View
      style={[
        styles.banner,
        compact && styles.bannerCompact,
        { backgroundColor: c.successLight, borderColor: c.successMid },
      ]}
    >
      <Text style={[styles.title, { color: c.success }]}>Merci pour votre avis.</Text>
      <Text style={[styles.message, { color: c.textSecondary }]}>{message}</Text>
    </View>
  );

  if (!onPress) return banner;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Merci pour votre avis. ${message}`}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {banner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bannerCompact: {
    marginHorizontal: spacing[4],
    padding: spacing[3],
  },
  banner: {
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    gap: spacing[1],
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.5,
  },
  pressed: {
    opacity: 0.92,
  },
});
