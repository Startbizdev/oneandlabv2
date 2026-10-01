import { useAppColors } from '@/theme/use-app-colors';

import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { CalendarDays, Clock, Layers } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { Cluster, Row } from '@/components/layout/primitives';
import { StatusBadge } from '@/components/ui/Badge';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

dayjs.locale('fr');

interface Props {
  primary: Appointment;
  batch: Appointment[];
  isMultiBatch: boolean;
}

export function PatientCompactHeader({
  primary, batch, isMultiBatch }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const scheduled = primary.scheduled_at ? dayjs(primary.scheduled_at) : null;
  const fd = (primary.form_data ?? {}) as Record<string, unknown>;
  const timeLabel = formatAvailabilityDisplayFr(fd.availability, primary.scheduled_at, fd);

  const typeLabel = isBloodTestAppointment(primary.type)
    ? 'Prélèvement'
    : isNursingAppointment(primary.type)
      ? 'Soins infirmiers'
      : 'Rendez-vous';

  const title = isMultiBatch
    ? `Lot · ${batch.length} rendez-vous`
    : (primary.category_name ?? 'Rendez-vous');

  return (
    <View style={styles.wrap}>
      <Row justify="between" align="start" gap={spacing[3]}>
        <Row align="start" gap={spacing[2]} style={styles.titleCol}>
          {isMultiBatch ? (
            <Layers size={iconSize.sm} color={c.primary} strokeWidth={2} />
          ) : null}
          <AppText style={styles.title} numberOfLines={2}>
            {title}
          </AppText>
        </Row>
        <StatusBadge status={primary.status} size="sm" />
      </Row>
      <Row wrap gap={4} align="center">
        <AppText style={styles.type}>{typeLabel}</AppText>
        {isMultiBatch ? (
          <AppText style={styles.batchHint}>· {batch.length} actes liés</AppText>
        ) : null}
      </Row>
      {scheduled || timeLabel ? (
        <View style={styles.schedule}>
          {scheduled ? (
            <Row gap={spacing[2]} align="center">
              <CalendarDays size={iconSize.xs} color={c.textTertiary} strokeWidth={2} />
              <AppText style={styles.date}>{scheduled.format('ddd D MMM YYYY')}</AppText>
            </Row>
          ) : null}
          {timeLabel ? (
            <Row gap={spacing[2]} align="center">
              <Clock size={iconSize.xs} color={c.textTertiary} strokeWidth={2} />
              <AppText style={styles.time}>{timeLabel}</AppText>
            </Row>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  wrap: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    minWidth: 0,
    flex: 1,
    ...font.heading,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    letterSpacing: -0.3,
    lineHeight: fontSize.lg * 1.2,
  },
  type: {
    ...font.medium,
    fontSize: fontSize.xs,
    color: c.primary,
  },
  batchHint: {
    ...font.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  schedule: { gap: spacing[1.5], marginTop: spacing[0.5] },
  date: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  time: {
    ...font.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
};
}

