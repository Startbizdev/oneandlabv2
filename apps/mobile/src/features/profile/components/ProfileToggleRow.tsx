import { StyleSheet, Text, View } from 'react-native';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  label: string;
  hint: string;
  value: boolean;
  busy?: boolean;
  disabled?: boolean;
  /** Fond primary sur la ligne quand activé (défaut true). */
  highlightWhenOn?: boolean;
  onValueChange: (v: boolean) => void;
}

export function ProfileToggleRow({
  label,
  hint,
  value,
  busy,
  disabled,
  highlightWhenOn = true,
  onValueChange,
}: Props) {
  const inactive = busy || disabled;
  const showActiveHighlight = highlightWhenOn && value && !disabled;

  return (
    <View style={[styles.row, showActiveHighlight && styles.rowOn, inactive && styles.rowBusy]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowHint, showActiveHighlight ? styles.rowHintOn : undefined]}>
          {hint}
        </Text>
      </View>
      <ToggleSwitch
        value={value}
        disabled={inactive}
        onValueChange={onValueChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
  },
  rowOn: {
    backgroundColor: colors.primaryLight,
  },
  rowBusy: { opacity: 0.55 },
  rowText: { flex: 1, flexShrink: 1, minWidth: 0, gap: 2 },
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
