import { Pressable, StyleSheet, View } from 'react-native';
import { useAppColors } from '@/theme/use-app-colors';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  message: string;
  compact?: boolean;
  onPress?: () => void;
}

/** Alerte avis publié — même pattern que RdvCancellationBanner. */
export function RdvPublishedReviewBanner({ message, compact, onPress }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);


  const banner = (
    <View
      style={[
        styles.banner,
        compact && styles.bannerCompact,
        { backgroundColor: c.successLight, borderColor: c.successMid },
      ]}
    >
      <AppText style={[styles.title, { color: c.success }]}>Merci pour votre avis.</AppText>
      <AppText style={[styles.message, { color: c.textSecondary }]}>{message}</AppText>
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

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
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
    ...font.semiBold,
    fontSize: fontSize.sm,
  },
  message: {
    ...font.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.5,
  },
  pressed: {
    opacity: 0.92,
  },
};
}
