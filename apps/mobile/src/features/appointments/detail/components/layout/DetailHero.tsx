import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

export function DetailHero({ primary, batch, isMultiBatch }: Props) {
  const c = useAppColors();
  const scheduled = primary.scheduled_at ? dayjs(primary.scheduled_at) : null;
  const fd = (primary.form_data ?? {}) as Record<string, unknown>;
  const timeLabel = formatAvailabilityDisplayFr(fd.availability, primary.scheduled_at);

  const typeLabel = isBloodTestAppointment(primary.type)
    ? 'Prélèvement'
    : isNursingAppointment(primary.type)
      ? 'Soins infirmiers'
      : 'Rendez-vous';

  const title = isMultiBatch
    ? `Lot de ${batch.length} rendez-vous`
    : (primary.category_name ?? 'Rendez-vous');

  return (
    <LinearGradient
      colors={[c.primaryLight, c.background]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrap}
    >
      <View style={styles.top}>
        <View style={styles.titleBlock}>
          {isMultiBatch ? (
            <Layers size={18} color={colors.primary} strokeWidth={2} style={styles.titleIcon} />
          ) : null}
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
        </View>
        {!isMultiBatch ? <StatusBadge status={primary.status} size="md" /> : null}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.typePill}>
          <Text style={styles.typePillText}>{typeLabel}</Text>
        </View>
        {isMultiBatch ? (
          <Text style={styles.batchHint}>{batch.length} actes liés · détails ci-dessous</Text>
        ) : null}
      </View>

      {!isMultiBatch && (scheduled || timeLabel) ? (
        <View style={styles.schedule}>
          <CalendarDays size={16} color={colors.primary} strokeWidth={2} />
          <View style={styles.scheduleTexts}>
            {scheduled ? (
              <Text style={styles.dateLine}>{scheduled.format('dddd D MMMM YYYY')}</Text>
            ) : null}
            {timeLabel ? (
              <View style={styles.timeRow}>
                <Clock size={12} color={colors.textTertiary} strokeWidth={2} />
                <Text style={styles.timeLine}>{timeLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: c.primaryMid,
    padding: spacing[4],
    gap: spacing[3],
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  titleBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2],
  },
  titleIcon: { marginTop: 4 },
  title: {
    flex: 1,
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize.xl,
    color: c.textPrimary,
    letterSpacing: -0.4,
    lineHeight: fontSize.xl * 1.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  typePill: {
    backgroundColor: c.primaryLight,
    paddingHorizontal: spacing[2.5],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  typePillText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
    letterSpacing: 0.3,
  },
  batchHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    flex: 1,
  },
  schedule: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[2.5],
    paddingTop: spacing[1],
  },
  scheduleTexts: { flex: 1, gap: 4 },
  dateLine: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    textTransform: 'capitalize',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeLine: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_layout_DetailHero_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
