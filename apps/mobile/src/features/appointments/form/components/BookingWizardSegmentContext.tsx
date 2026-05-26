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
import { colors, radius, spacing } from '@/theme';
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

const styles = StyleSheet.create({
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
    fontSize: fontSize['2xs'],
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  doneLine: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    paddingLeft: spacing[5],
  },
  doneBold: { fontFamily: fontFamily.semiBold, color: colors.textPrimary },
  doneDate: { color: colors.textTertiary },
  card: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    backgroundColor: colors.primary,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    padding: spacing[3],
    gap: spacing[2],
  },
  badge: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
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
    backgroundColor: colors.primaryLight,
  },
  pillText: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize['2xs'],
    color: colors.primaryDark,
  },
});
