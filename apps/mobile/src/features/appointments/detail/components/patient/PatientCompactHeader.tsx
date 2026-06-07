import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { CalendarDays, Clock, Layers } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { StatusBadge } from '@/components/ui/Badge';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

interface Props {
  primary: Appointment;
  batch: Appointment[];
  isMultiBatch: boolean;
}

export function PatientCompactHeader({ primary, batch, isMultiBatch }: Props) {
  const scheduled = primary.scheduled_at ? dayjs(primary.scheduled_at) : null;
  const fd = (primary.form_data ?? {}) as Record<string, unknown>;
  const timeLabel = formatAvailabilityDisplayFr(fd.availability, primary.scheduled_at);

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
      <View style={styles.top}>
        <View style={styles.titleCol}>
          {isMultiBatch ? (
            <Layers size={16} color={colors.primary} strokeWidth={2} />
          ) : null}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
        <StatusBadge status={primary.status} size="sm" />
      </View>
      <View style={styles.meta}>
        <Text style={styles.type}>{typeLabel}</Text>
        {isMultiBatch ? (
          <Text style={styles.batchHint}>· {batch.length} actes liés</Text>
        ) : null}
      </View>
      {scheduled || timeLabel ? (
        <View style={styles.schedule}>
          {scheduled ? (
            <View style={styles.scheduleLine}>
              <CalendarDays size={14} color={colors.textTertiary} strokeWidth={2} />
              <Text style={styles.date}>{scheduled.format('ddd D MMM YYYY')}</Text>
            </View>
          ) : null}
          {timeLabel ? (
            <View style={styles.scheduleLine}>
              <Clock size={14} color={colors.textTertiary} strokeWidth={2} />
              <Text style={styles.time}>{timeLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[2],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  titleCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
    minWidth: 0,
  },
  title: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    letterSpacing: -0.3,
    lineHeight: fontSize.lg * 1.2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  type: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.primary,
  },
  batchHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  schedule: { gap: spacing[1.5], marginTop: spacing[0.5] },
  scheduleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  date: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  time: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_patient_PatientCompactHeader_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
