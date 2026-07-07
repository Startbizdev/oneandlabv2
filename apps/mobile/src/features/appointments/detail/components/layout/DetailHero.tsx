import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { CalendarDays, Clock, Layers } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { Cluster, Row } from '@/components/layout/primitives';
import { StatusBadge } from '@/components/ui/Badge';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

interface Props {
  primary: Appointment;
  batch: Appointment[];
  isMultiBatch: boolean;
}

export function DetailHero({ primary, batch, isMultiBatch }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_layout_DetailHero_tsx_styles');
  const scheduled = primary.scheduled_at ? dayjs(primary.scheduled_at) : null;
  const fd = (primary.form_data ?? {}) as Record<string, unknown>;
  const timeLabel = formatAvailabilityDisplayFr(fd.availability, primary.scheduled_at, fd);

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
      <Row justify="between" align="start" gap={spacing[3]}>
        <Row align="start" gap={spacing[2]} style={styles.titleBlock}>
          {isMultiBatch ? (
            <Layers size={iconSize.mdSm} color={c.primary} strokeWidth={2} style={styles.titleIcon} />
          ) : null}
          <AppText style={styles.title} numberOfLines={2}>
            {title}
          </AppText>
        </Row>
        {!isMultiBatch ? <StatusBadge status={primary.status} size="md" /> : null}
      </Row>

      <Row wrap gap={spacing[2]} align="center">
        <View style={styles.typePill}>
          <AppText style={styles.typePillText}>{typeLabel}</AppText>
        </View>
        {isMultiBatch ? (
          <AppText style={styles.batchHint}>{batch.length} actes liés · détails ci-dessous</AppText>
        ) : null}
      </Row>

      {!isMultiBatch && (scheduled || timeLabel) ? (
        <Cluster
          gap={spacing[2.5]}
          align="start"
          style={styles.schedule}
          leading={<CalendarDays size={iconSize.sm} color={c.primary} strokeWidth={2} />}
        >
          <View style={styles.scheduleTexts}>
            {scheduled ? (
              <AppText style={styles.dateLine}>{scheduled.format('dddd D MMMM YYYY')}</AppText>
            ) : null}
            {timeLabel ? (
              <Row gap={4} align="center">
                <Clock size={iconSize['2xs']} color={c.textTertiary} strokeWidth={2} />
                <AppText style={styles.timeLine}>{timeLabel}</AppText>
              </Row>
            ) : null}
          </View>
        </Cluster>
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
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleIcon: { marginTop: 4 },
  title: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize.xl,
    color: c.textPrimary,
    letterSpacing: -0.4,
    lineHeight: fontSize.xl * 1.2,
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
    minWidth: 0,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    flex: 1,
  },
  schedule: {
    paddingTop: spacing[1],
  },
  scheduleTexts: { gap: 4 },
  dateLine: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    textTransform: 'capitalize' as const,
  },
  timeLine: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
};
}

