import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, Text, View } from 'react-native';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export type DetailInfoItem = {
  label: string;
  value: string;
  muted?: boolean;
};

/** Liste verticale label au-dessus de la valeur (pas de tableau 2 colonnes). */
export function DetailInfoStack({ items }: { items: DetailInfoItem[] }) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_layout_DetailInfoStack_tsx_DetailInfoStack_styles');

  if (!items.length) return null;
  return (
    <View style={styles.stack}>
      {items.map((item, i) => (
        <View key={`${item.label}-${i}`} style={i > 0 ? styles.itemBorder : undefined}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={[styles.value, item.muted && styles.valueMuted]}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  stack: {
    gap: 0,
  },
  itemBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
    paddingTop: spacing[3],
    marginTop: spacing[3],
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    marginBottom: 4,
  },
  value: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
  valueMuted: {
    fontFamily: fontFamily.regular,
    color: c.textSecondary,
  },
};
}
