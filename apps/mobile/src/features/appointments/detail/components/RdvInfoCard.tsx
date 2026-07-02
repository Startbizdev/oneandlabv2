import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { CalendarDays, Clock } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Cluster, Row } from '@/components/layout/primitives';
import { StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

/** En-tête visuel : type de soin, statut, date et heure. */
export function RdvInfoCard({
  apt }: { apt: Appointment }) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_RdvInfoCard_tsx_styles');
  const scheduled = apt.scheduled_at ? dayjs(apt.scheduled_at) : null;
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const timeLabel = formatAvailabilityDisplayFr(fd.availability, apt.scheduled_at, fd);

  return (
    <Card shadow="sm" padding="md">
      <Row justify="between" align="start" gap={spacing[3]} style={styles.topRow}>
        <Text style={styles.category} numberOfLines={2}>
          {apt.category_name ?? 'Rendez-vous'}
        </Text>
        <StatusBadge status={apt.status} size="md" />
      </Row>

      <Cluster
        gap={spacing[3]}
        align="center"
        leading={
          <View style={styles.iconCircle}>
            <CalendarDays size={18} color={c.primary} strokeWidth={2} />
          </View>
        }
      >
        <View style={styles.dateTexts}>
          {scheduled ? (
            <>
              <Text style={styles.dayText}>
                {scheduled.format('dddd D MMMM YYYY')}
              </Text>
              {timeLabel ? (
                <Row gap={4} align="center">
                  <Clock size={12} color={c.textTertiary} strokeWidth={2} />
                  <Text style={styles.timeText}>{timeLabel}</Text>
                </Row>
              ) : null}
            </>
          ) : (
            <Text style={styles.dayMuted}>Date à définir</Text>
          )}
        </View>
      </Cluster>
    </Card>
  );
}

function buildStyles(c: AppColors) {
  return {
  topRow: {
    marginBottom: spacing[3],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderLight,
  },
  category: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  dateTexts: {
    gap: 4,
  },
  dayText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    textTransform: 'capitalize' as const,
  },
  dayMuted: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textTertiary,
  },
  timeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.primary,
  },
};
}

