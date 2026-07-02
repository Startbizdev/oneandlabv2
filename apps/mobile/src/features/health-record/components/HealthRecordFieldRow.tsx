import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Platform, Text, View } from 'react-native';
import { CheckCircle2, CircleDashed } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { Badge } from '@/components/ui/Badge';
import {
  HEALTH_RECORD_EMPTY_LABEL,
  HEALTH_RECORD_OPTIONAL_BADGE,
  formatHealthRecordDisplay,
  healthRecordFieldAccessibilityLabel,
  isHealthRecordValueFilled,
} from '../utils/health-record-display';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  label: string;
  display?: string | null;
}

export function HealthRecordFieldRow({ label, display: rawDisplay }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'HealthRecordFieldRow');
  const display = formatHealthRecordDisplay(rawDisplay);
  const filled = isHealthRecordValueFilled(display);
  const a11yLabel = healthRecordFieldAccessibilityLabel(label, display, filled);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
    >
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>

      {filled ? (
        <View style={[styles.valueShell, styles.valueShellFilled]}>
          <Row gap={spacing[2]} align="center" style={styles.valueInner}>
            <CheckCircle2
              size={16}
              color={c.success}
              strokeWidth={2.25}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.valueFilled} numberOfLines={3}>
              {display}
            </Text>
          </Row>
        </View>
      ) : (
        <View style={[styles.valueShell, styles.valueShellEmpty]}>
          <Row gap={spacing[2]} align="center" justify="between" style={styles.valueInner}>
            <Row gap={spacing[2]} align="center" style={styles.emptyLeading}>
              <CircleDashed
                size={16}
                color={c.textTertiary}
                strokeWidth={2}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.valueEmpty}>{HEALTH_RECORD_EMPTY_LABEL}</Text>
            </Row>
            <Badge
              label={HEALTH_RECORD_OPTIONAL_BADGE}
              variant="neutral"
              dot={false}
              size="sm"
              shape="square"
            />
          </Row>
        </View>
      )}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
    row: {
      gap: spacing[1.5],
    },
    label: {
      fontFamily: fontFamily.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
      letterSpacing: 0.2,
    },
    valueShell: {
      borderRadius: radius.lg,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2.5],
      minHeight: 44,
      justifyContent: 'center' as const,
    },
    valueShellFilled: {
      backgroundColor: c.successLight,
      borderWidth: 1,
      borderColor: c.successMid,
      ...Platform.select({
        ios: { borderCurve: 'continuous' as const },
        default: {},
      }),
    },
    valueShellEmpty: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderStyle: 'dashed' as const,
      ...Platform.select({
        ios: { borderCurve: 'continuous' as const },
        default: {},
      }),
    },
    valueInner: {
      minWidth: 0,
      flex: 1,
    },
    emptyLeading: {
      flex: 1,
      minWidth: 0,
    },
    valueFilled: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
      lineHeight: fontSize.sm * 1.45,
    },
    valueEmpty: {
      flex: 1,
      minWidth: 0,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textTertiary,
      lineHeight: fontSize.sm * 1.45,
    },
  };
}
