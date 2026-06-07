import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { CalendarDays, Clock } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

dayjs.locale('fr');

/** En-tête visuel : type de soin, statut, date et heure. */
export function RdvInfoCard({ apt }: { apt: Appointment }) {
  const scheduled = apt.scheduled_at ? dayjs(apt.scheduled_at) : null;
  const fd = (apt.form_data ?? {}) as { availability?: unknown };
  const timeLabel = formatAvailabilityDisplayFr(fd.availability, apt.scheduled_at);

  return (
    <Card shadow="sm" padding="md">
      <View style={styles.topRow}>
        <Text style={styles.category} numberOfLines={2}>
          {apt.category_name ?? 'Rendez-vous'}
        </Text>
        <StatusBadge status={apt.status} size="md" />
      </View>

      <View style={styles.dateRow}>
        <View style={styles.iconCircle}>
          <CalendarDays size={18} color={colors.primary} strokeWidth={2} />
        </View>
        <View style={styles.dateTexts}>
          {scheduled ? (
            <>
              <Text style={styles.dayText}>
                {scheduled.format('dddd D MMMM YYYY')}
              </Text>
              {timeLabel ? (
                <View style={styles.timeRow}>
                  <Clock size={12} color={colors.textTertiary} strokeWidth={2} />
                  <Text style={styles.timeText}>{timeLabel}</Text>
                </View>
              ) : null}
            </>
          ) : (
            <Text style={styles.dayMuted}>Date à définir</Text>
          )}
        </View>
      </View>
    </Card>
  );
}

function buildStyles(c: AppColors) {
  return {
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing[3],
    marginBottom: spacing[3],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderLight,
  },
  category: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: c.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTexts: {
    flex: 1,
    gap: 4,
  },
  dayText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    textTransform: 'capitalize',
  },
  dayMuted: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textTertiary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.primary,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_detail_components_RdvInfoCard_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
