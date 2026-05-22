import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  bordered?: boolean;
}

export function OfferInfoRow({ icon: Icon, label, value, bordered }: Props) {
  if (!value.trim()) return null;
  return (
    <View style={[styles.row, bordered && styles.bordered]}>
      <Icon size={16} color={colors.textSecondary} strokeWidth={2} style={styles.icon} />
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  bordered: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  icon: { marginTop: 2 },
  body: { flex: 1, gap: 2, minWidth: 0 },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: fontSize.sm * 1.4,
  },
});
