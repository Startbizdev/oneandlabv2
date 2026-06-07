import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Titre de section au-dessus d’une carte (hiérarchie fiche RDV). */
export function RdvSection({ title, children, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2],
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    paddingHorizontal: spacing[1],
  },
});
