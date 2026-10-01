import { useAppColors } from '@/theme/use-app-colors';
import { View } from 'react-native';
import { AppText, useStyles, font, type Theme } from '@/theme';
import { spacing } from '@/theme';

type Props = {
  label: string;
};

export function TourSlotSectionLabel({ label }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  return (
    <View style={styles.wrap}>
      <AppText style={[styles.label, { color: c.textTertiary }]}>{label}</AppText>
    </View>
  );
}

function buildStyles({ fontSize }: Theme) {
  return {
    wrap: {
      marginTop: spacing[2],
      marginBottom: spacing[1.5],
    },
    label: {
      ...font.semiBold,
      fontSize: fontSize.sm,
    },
  };
}
