import { StyleSheet, View, type ViewStyle } from 'react-native';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Titre de section au-dessus d’une carte (hiérarchie fiche RDV). */
export function RdvSection({ title, children, style }: Props) {
  const styles = useStyles(buildStyles);

  return (
    <View style={[styles.wrap, style]}>
      <AppText style={styles.title}>{title}</AppText>
      {children}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrap: {
    gap: spacing[2],
  },
  title: {
    ...font.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
    paddingHorizontal: spacing[1],
  },
};
}
