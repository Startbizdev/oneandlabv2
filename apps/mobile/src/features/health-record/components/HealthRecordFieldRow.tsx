import { View } from 'react-native';
import {
  formatHealthRecordDisplay,
  healthRecordFieldAccessibilityLabel,
  isHealthRecordValueFilled,
} from '../utils/health-record-display';
import { AppText, spacing, useStyles, type Theme } from '@/theme';

interface Props {
  label: string;
  display?: string | null;
}

export function HealthRecordFieldRow({ label, display: rawDisplay }: Props) {
  const styles = useStyles(buildStyles);
  const display = formatHealthRecordDisplay(rawDisplay);
  const filled = isHealthRecordValueFilled(display);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={healthRecordFieldAccessibilityLabel(label, display, filled)}
    >
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="body" style={filled ? styles.value : styles.empty}>
        {display}
      </AppText>
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    row: { gap: spacing[0.5] },
    label: { color: c.textSecondary },
    value: { color: c.textPrimary },
    empty: { color: c.textTertiary },
  };
}
