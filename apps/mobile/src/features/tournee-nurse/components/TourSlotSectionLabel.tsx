import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { View } from 'react-native';
import { AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { spacing } from '@/theme';

type Props = {
  label: string;
};

export function TourSlotSectionLabel({ label }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  return (
    <View style={styles.wrap}>
      <AppText style={[styles.label, { color: c.textTertiary }]}>{label}</AppText>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    wrap: {
      marginTop: spacing[2],
      marginBottom: spacing[1.5],
    },
    label: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.6,
    },
  };
}
