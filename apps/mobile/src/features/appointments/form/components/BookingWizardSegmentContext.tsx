import { StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { CircleCheck } from 'lucide-react-native';
import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import { CareIcon } from '@/features/categories/components/CareIcon';
import { formatDateCompact } from '@/utils/appointment-display';
import {
  bookingWizardLotKind,
  bookingWizardLotStepLabel,
  bookingWizardLotTitle,
  bookingWizardServiceDisplayName,
} from '../utils/booking-wizard-lot';
import {
  ICON_STROKE_WIDTH,
  radius,
  spacing,
  iconSize,
  AppText,
  useAppColors,
  useStyles,
  type Theme,
} from '@/theme';

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

/** Soin (ou lot) en cours de planification, et créneaux déjà choisis pour les lots précédents. */
export function BookingWizardSegmentContext({
  activeService,
  lotServices,
  previousRecaps,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const kind = bookingWizardLotKind(activeService);
  const title = bookingWizardLotTitle(lotServices, kind);

  return (
    <View style={styles.wrap}>
      <Row style={styles.card} gap={spacing[3]} align="center">
        <CareIcon care={activeService} variant="well" />
        <View style={styles.copy}>
          <AppText variant="caption" style={styles.kind}>
            {bookingWizardLotStepLabel(kind)}
          </AppText>
          <AppText variant="headline">{title}</AppText>
          {lotServices.length > 1 ? (
            <AppText variant="secondary">
              {lotServices.map(bookingWizardServiceDisplayName).join(' · ')}
            </AppText>
          ) : null}
        </View>
      </Row>

      {previousRecaps.length > 0 ? (
        <View style={styles.doneBlock}>
          {previousRecaps.map((r) => (
            <Row key={r.serviceId} gap={spacing[2]} align="start">
              <CircleCheck size={iconSize.md} color={c.success} strokeWidth={ICON_STROKE_WIDTH} />
              <AppText variant="secondary" style={styles.doneLine}>
                {r.shortLabel}
                {r.dateLabel ? ` · ${r.dateLabel}` : ''}
              </AppText>
            </Row>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function recapDateLabel(scheduledAt: string | undefined): string | undefined {
  if (!scheduledAt?.trim()) return undefined;
  return formatDateCompact(scheduledAt) || scheduledAt.slice(0, 10);
}

function buildStyles({ colors: c }: Theme) {
  return {
    wrap: { gap: spacing[2] },
    card: {
      padding: spacing[3],
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      backgroundColor: c.surface,
    },
    copy: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    kind: { color: c.textSecondary },
    doneBlock: { gap: spacing[1], paddingHorizontal: spacing[1] },
    doneLine: { flex: 1, minWidth: 0 },
  };
}
