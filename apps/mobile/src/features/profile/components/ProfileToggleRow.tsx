import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  label: string;
  hint: string;
  value: boolean;
  busy?: boolean;
  onValueChange: (v: boolean) => void;
}

export function ProfileToggleRow({ label, hint, value, busy, onValueChange }: Props) {
  return (
    <View style={[styles.row, value && styles.rowOn, busy && styles.rowBusy]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowHint, value ? styles.rowHintOn : undefined]}>{hint}</Text>
      </View>
      <Switch
        value={value}
        disabled={busy}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primaryMid }}
        thumbColor={value ? colors.primary : colors.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
  },
  rowOn: {
    backgroundColor: colors.primaryLight,
  },
  rowBusy: { opacity: 0.55 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  rowHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  rowHintOn: { color: colors.primary },
});
