import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';

type Props = {
  embedded?: boolean;
};

/** Bandeau discret — données de démo en dev. */
export function TourMockBanner({ embedded = false }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <View
      style={[
        styles.banner,
        embedded && styles.bannerEmbedded,
        {
          backgroundColor: hexToRgba(c.warning, 0.1),
          borderColor: hexToRgba(c.warning, 0.28),
        },
      ]}
    >
      <Text style={styles.emoji}>🧪</Text>
      <Text style={[styles.text, { color: c.textSecondary }]}>
        Aperçu démo — RDV fictifs pour visualiser la tournée
      </Text>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    banner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[2],
      marginBottom: spacing[2],
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
    },
    bannerEmbedded: {
      marginBottom: spacing[2],
    },
    emoji: { fontSize: 16 },
    text: {
      flex: 1,
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      lineHeight: fontSize.xs * 1.45,
    },
  };
}
