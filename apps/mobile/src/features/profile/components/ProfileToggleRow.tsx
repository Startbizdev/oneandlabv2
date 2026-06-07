import { StyleSheet, Text, View } from 'react-native';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { radius, spacing } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
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
  const c = useAppColors();
  const inactive = busy || disabled;
  const showActiveHighlight = highlightWhenOn && value && !disabled;

  return (
    <View
      style={[
        styles.row,
        showActiveHighlight && { backgroundColor: c.primaryLight },
        inactive && styles.rowBusy,
      ]}
    >
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: c.textPrimary }]}>{label}</Text>
        <Text
          style={[
            styles.rowHint,
            { color: showActiveHighlight ? c.primary : c.textTertiary },
          ]}
        >
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
  rowBusy: { opacity: 0.55 },
  rowText: { flex: 1, flexShrink: 1, minWidth: 0, gap: 2 },
  rowLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
  },
  rowHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
  },
});
