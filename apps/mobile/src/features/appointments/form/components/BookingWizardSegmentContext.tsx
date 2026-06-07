import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { colors } from '@/theme';
import { StyleSheet, Text, View } from 'react-native';
import { CircleCheck } from 'lucide-react-native';
import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import { formatDateCompact } from '@/utils/appointment-display';
import {
  bookingWizardLotKind,
  bookingWizardLotStepLabel,
  bookingWizardLotTitle,
  bookingWizardServiceDisplayName,
  type BookingWizardLotKind,
} from '../utils/booking-wizard-lot';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export interface WizardRecapItem {
  serviceId: string;
  shortLabel: string;
  dateLabel?: string;
}

interface Props {
  activeService: SelectedServiceInput;
  lotServices: SelectedServiceInput[];
  previousRecaps: WizardRecapItem[];
}

/** Bandeau lot (prélèvements / soins infirmiers groupés) — aligné web BookingWizardSegmentContext. */
export function BookingWizardSegmentContext({
  activeService,
  lotServices,
  previousRecaps,
}: Props) {
  const kind: BookingWizardLotKind = bookingWizardLotKind(activeService);
  const stepLabel = bookingWizardLotStepLabel(kind);
  const title = bookingWizardLotTitle(lotServices, kind);

  return (
    <View style={styles.wrap}>
      {previousRecaps.length > 0 ? (
        <View style={styles.doneBlock}>
          <View style={styles.doneHeader}>
            <CircleCheck size={14} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.doneTitle}>Déjà planifié</Text>
          </View>
          {previousRecaps.map((r) => (
            <Text key={r.serviceId} style={styles.doneLine} numberOfLines={2}>
              <Text style={styles.doneBold}>{r.shortLabel}</Text>
              {r.dateLabel ? <Text style={styles.doneDate}> — {r.dateLabel}</Text> : null}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.accent} />
        <View style={styles.copy}>
          <Text style={styles.badge}>{stepLabel}</Text>
          <Text style={styles.title} numberOfLines={3}>
            {title}
          </Text>
          {lotServices.length > 1 ? (
            <View style={styles.pillRow}>
              {lotServices.map((s) => (
                <View key={s.id} style={styles.pill}>
                  <Text style={styles.pillText} numberOfLines={1}>
                    {bookingWizardServiceDisplayName(s)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function recapDateLabel(scheduledAt: string | undefined): string | undefined {
  if (!scheduledAt?.trim()) return undefined;
  return formatDateCompact(scheduledAt) || scheduledAt.slice(0, 10);
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[3] },
  doneBlock: {
    gap: spacing[1],
    paddingVertical: spacing[1],
  },
  doneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },
  doneTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  doneLine: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    paddingLeft: spacing[5],
  },
  doneBold: { fontFamily: fontFamily.semiBold, color: c.textPrimary },
  doneDate: { color: c.textTertiary },
  card: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surface,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    backgroundColor: c.primary,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    padding: spacing[3],
    gap: spacing[2],
  },
  badge: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.35,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
  },
  pill: {
    maxWidth: '100%',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
    backgroundColor: c.primaryLight,
  },
  pillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.primaryDark,
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('features_appointments_form_components_BookingWizardSegmentContext_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
