import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/** Titre de section au-dessus d’une carte (hiérarchie fiche RDV). */
export function RdvSection({ title, children, style }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_RdvSection_tsx_RdvSection_styles');

  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    gap: spacing[2],
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.9,
    textTransform: 'uppercase' as const,
    paddingHorizontal: spacing[1],
  },
};
}
