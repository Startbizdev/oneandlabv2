import { useAppColors } from '@/theme/use-app-colors';

import { StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { CalendarDays, Clock } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Cluster, Row } from '@/components/layout/primitives';
import { StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

dayjs.locale('fr');

/** En-tête visuel : type de soin, statut, date et heure. */
export function RdvInfoCard({
  apt }: { apt: Appointment }) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const scheduled = apt.scheduled_at ? dayjs(apt.scheduled_at) : null;
  const fd = (apt.form_data ?? {}) as Record<string, unknown>;
  const timeLabel = formatAvailabilityDisplayFr(fd.availability, apt.scheduled_at, fd);

  return (
    <Card shadow="sm" padding="md">
      <Row justify="between" align="start" gap={spacing[3]} style={styles.topRow}>
        <AppText style={styles.category} numberOfLines={2}>
          {apt.category_name ?? 'Rendez-vous'}
        </AppText>
        <StatusBadge status={apt.status} size="md" />
      </Row>

      <Cluster
        gap={spacing[3]}
        align="center"
        leading={
          <View style={styles.iconCircle}>
            <CalendarDays size={iconSize.mdSm} color={c.primary} strokeWidth={2} />
          </View>
        }
      >
        <View style={styles.dateTexts}>
          {scheduled ? (
            <>
              <AppText style={styles.dayText}>
                {scheduled.format('dddd D MMMM YYYY')}
              </AppText>
              {timeLabel ? (
                <Row gap={4} align="center">
                  <Clock size={iconSize['2xs']} color={c.textTertiary} strokeWidth={2} />
                  <AppText style={styles.timeText}>{timeLabel}</AppText>
                </Row>
              ) : null}
            </>
          ) : (
            <AppText style={styles.dayMuted}>Date à définir</AppText>
          )}
        </View>
      </Cluster>
    </Card>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
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
    ...font.heading,
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
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    textTransform: 'capitalize' as const,
  },
  dayMuted: {
    ...font.medium,
    fontSize: fontSize.sm,
    color: c.textTertiary,
  },
  timeText: {
    ...font.bold,
    fontSize: fontSize.base,
    color: c.primary,
  },
};
}

