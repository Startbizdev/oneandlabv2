import { View } from 'react-native';
import { AppText, spacing, useStyles, type Theme } from '@/theme';

interface Props {
  label: string;
  text: string;
}

/** Réponse du professionnel sous un avis : retrait éditorial, sans fond coloré. */
export function ReviewResponseBlock({ label, text }: Props) {
  const styles = useStyles(buildStyles);
  return (
    <View style={styles.wrap}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="secondary">{text}</AppText>
    </View>
  );
}

function buildStyles({ colors: c, font }: Theme) {
  return {
    wrap: {
      gap: spacing[1],
      paddingLeft: spacing[3],
      borderLeftWidth: 2,
      borderLeftColor: c.borderLight,
    },
    label: { ...font.semiBold },
  };
}
