import { StyleSheet, View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';

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
  const styles = useStyles(buildStyles);

  const inactive = busy || disabled;
  const showActiveHighlight = highlightWhenOn && value && !disabled;

  return (
    <Cluster
      gap={spacing[3]}
      actions={
        <ToggleSwitch
          value={value}
          accessibilityLabel={label}
          disabled={inactive}
          onValueChange={onValueChange}
        />
      }
      style={[
        styles.row,
        showActiveHighlight && { backgroundColor: c.primaryLight },
        inactive && styles.rowBusy,
      ]}
    >
      <View style={styles.rowText}>
        <AppText style={[styles.rowLabel, { color: c.textPrimary }]}>{label}</AppText>
        <AppText
          style={[
            styles.rowHint,
            { color: showActiveHighlight ? c.primary : c.textTertiary },
          ]}
        >
          {hint}
        </AppText>
      </View>
    </Cluster>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  row: {
    alignSelf: 'stretch' as const,
    width: '100%' as const,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.lg,
  },
  rowBusy: { opacity: 0.55 },
  rowText: { flex: 1, flexShrink: 1, minWidth: 0, gap: 2 },
  rowLabel: {
    ...font.semiBold,
    fontSize: fontSize.sm,
  },
  rowHint: {
    ...font.regular,
    fontSize: fontSize.xs,
  },
};
}
