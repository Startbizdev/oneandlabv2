import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
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
import { radius, spacing, iconSize, AppText } from '@/theme';
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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_BookingWizardSegmentContext_tsx_styles');
  const kind: BookingWizardLotKind = bookingWizardLotKind(activeService);
  const stepLabel = bookingWizardLotStepLabel(kind);
  const title = bookingWizardLotTitle(lotServices, kind);

  return (
    <View style={styles.wrap}>
      {previousRecaps.length > 0 ? (
        <View style={styles.doneBlock}>
          <Row gap={spacing[1.5]} align="center">
            <CircleCheck size={iconSize.xs} color={c.primary} strokeWidth={2.5} />
            <AppText style={styles.doneTitle}>Déjà planifié</AppText>
          </Row>
          {previousRecaps.map((r) => (
            <AppText key={r.serviceId} style={styles.doneLine} numberOfLines={2}>
              <AppText style={styles.doneBold}>{r.shortLabel}</AppText>
              {r.dateLabel ? <AppText style={styles.doneDate}> — {r.dateLabel}</AppText> : null}
            </AppText>
          ))}
        </View>
      ) : null}

      <Row style={styles.card}>
        <View style={styles.accent} />
        <View style={styles.copy}>
          <AppText style={styles.badge}>{stepLabel}</AppText>
          <AppText style={styles.title} numberOfLines={3}>
            {title}
          </AppText>
          {lotServices.length > 1 ? (
            <Row wrap gap={spacing[1.5]}>
              {lotServices.map((s) => (
                <View key={s.id} style={styles.pill}>
                  <AppText style={styles.pillText} numberOfLines={1}>
                    {bookingWizardServiceDisplayName(s)}
                  </AppText>
                </View>
              ))}
            </Row>
          ) : null}
        </View>
      </Row>
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
  doneTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
    textTransform: 'uppercase' as const,
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
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surface,
    overflow: 'hidden' as const,
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
    textTransform: 'uppercase' as const,
    letterSpacing: 0.35,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
    lineHeight: fontSize.sm * 1.35,
  },
  pill: {
    maxWidth: '100%' as const,
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

