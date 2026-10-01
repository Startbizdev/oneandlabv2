import { useMemo } from 'react';
import { View } from 'react-native';
import {
  PATIENT_VIP_MAX_HOUR,
  PATIENT_VIP_MIN_HOUR,
  PATIENT_VIP_MINUTE_STEPS,
} from '@oneandlab/shared-constants';
import { Row } from '@/components/layout/primitives';
import { SelectField, type SelectOption } from '@/components/ui/SelectField';
import { spacing, AppText, useStyles, font, type Theme } from '@/theme';
import { lh } from '@/theme/typography';

const VIP_HOUR_OPTIONS: SelectOption[] = Array.from(
  { length: PATIENT_VIP_MAX_HOUR - PATIENT_VIP_MIN_HOUR + 1 },
  (_, i) => {
    const h = PATIENT_VIP_MIN_HOUR + i;
    return { value: String(h), label: `${h}h` };
  },
);

const VIP_MINUTE_OPTIONS: SelectOption[] = PATIENT_VIP_MINUTE_STEPS.map((m) => ({
  value: String(m),
  label: String(m).padStart(2, '0'),
}));

interface Props {
  urgentHour: number;
  urgentMinute: number;
  onHourChange: (hour: number) => void;
  onMinuteChange: (minute: number) => void;
}

/** Heure + minutes VIP — deux listes déroulantes (aligné web). */
export function VipScheduledTimePicker({
  urgentHour,
  urgentMinute,
  onHourChange,
  onMinuteChange,
}: Props) {
  const styles = useStyles(buildStyles);
  const hourValue = String(urgentHour);
  const minuteValue = String(urgentMinute);
  const summary = useMemo(
    () => `${String(urgentHour).padStart(2, '0')}h${String(urgentMinute).padStart(2, '0')}`,
    [urgentHour, urgentMinute],
  );

  return (
    <View style={styles.wrap}>
      <AppText style={styles.sectionLabel}>Horaire</AppText>
      <Row align="center" gap={spacing[2]} style={styles.pickersRow}>
        <View style={styles.pickerCol}>
          <SelectField
            hideLabel
            label="Heure"
            value={hourValue}
            options={VIP_HOUR_OPTIONS}
            onChange={(next) => {
              const h = Number(next);
              if (Number.isFinite(h)) onHourChange(h);
            }}
            placeholder="Heure"
            sheetTitle="Heure"
          />
        </View>
        <AppText style={styles.colon}>:</AppText>
        <View style={styles.pickerColMinute}>
          <SelectField
            hideLabel
            label="Minutes"
            value={minuteValue}
            options={VIP_MINUTE_OPTIONS}
            onChange={(next) => {
              const m = Number(next);
              if (Number.isFinite(m)) onMinuteChange(m);
            }}
            placeholder="Min"
            sheetTitle="Minutes"
          />
        </View>
      </Row>
      <AppText style={styles.summary}>Créneau : {summary}</AppText>
      <AppText style={styles.hint}>
        De {PATIENT_VIP_MIN_HOUR}h à {PATIENT_VIP_MAX_HOUR}h, par pas de 15 minutes.
      </AppText>
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: { gap: spacing[2] },
    sectionLabel: {
      ...font.medium,
      fontSize: fontSize.xs,
      color: c.textSecondary,
    },
    pickersRow: {
      width: '100%' as const,
    },
    pickerCol: {
      flex: 1,
      minWidth: 0,
    },
    pickerColMinute: {
      width: 108,
      flexShrink: 0,
    },
    colon: {
      ...font.heading,
      fontSize: fontSize.xl,
      color: c.textTertiary,
      marginBottom: spacing[0.5],
    },
    summary: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: '#92400e',
    },
    hint: {
      ...font.regular,
      fontSize: fontSize.xs,
      lineHeight: lh(fontSize.xs, 1.4),
      color: c.textTertiary,
    },
  };
}
