import { View } from 'react-native';
import { Cluster } from '@/components/layout/primitives';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';

interface Props {
  label: string;
  hint: string;
  value: boolean;
  busy?: boolean;
  disabled?: boolean;
  onValueChange: (v: boolean) => void;
}

/** Ligne interrupteur (libellé + état en une ligne) dans une carte de profil. */
export function ProfileToggleRow({ label, hint, value, busy, disabled, onValueChange }: Props) {
  const styles = useStyles(buildStyles);
  const inactive = busy || disabled;

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
      style={[styles.row, inactive && styles.rowBusy]}
    >
      <View style={styles.rowText}>
        <AppText style={styles.rowLabel}>{label}</AppText>
        <AppText variant="caption">{hint}</AppText>
      </View>
    </Cluster>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
    row: {
      alignSelf: 'stretch' as const,
      width: '100%' as const,
      paddingVertical: spacing[3],
    },
    rowBusy: { opacity: 0.55 },
    rowText: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    rowLabel: {
      ...text.body,
      ...font.medium,
      color: c.textPrimary,
    },
  };
}
