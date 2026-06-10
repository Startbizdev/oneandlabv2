import { palette, type AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import {
  type AppointmentListRow,
  batchLotSummaryLabel,
  displayAppointmentForListRow,
  isBloodTestOnlyBatchRow,
  isNursingOnlyBatchRow,
} from '@/utils/appointment-batch';
import { offerAppointmentNotes } from '@/features/appointments/detail/utils/offer-appointment-display';
import { RdvListCardCreneauRow } from '@/features/appointments/components/RdvListCardCreneauRow';
import { RdvCareTagsRow } from '@/features/appointments/components/RdvCareTagsRow';
import { MiniDateCalendar, miniDateCalendarOuterSize } from '@/components/ui/MiniDateCalendar';
import { RdvListCardPersonRow } from '@/features/appointments/components/RdvListCardPersonRow';
import {
  rdvMaquetteAvatarCounterparty,
  rdvMaquetteTimeLabel,
  type RdvListCardViewerRole,
} from '@/utils/rdv-maquette-card-display';
import { buildRdvListCardTypography } from './rdv-list-card-typography';
import { maskOfferCounterparty } from '@/utils/offer-privacy-display';
import { spacing } from '@/theme';
import { fontFamily } from '@/theme/typography';

const LIST_CARD_CALENDAR_SIZE = 'xs' as const;
const LIST_CARD_CALENDAR_PX = miniDateCalendarOuterSize(LIST_CARD_CALENDAR_SIZE);
/** Aligné sur `AppointmentListRowCard` inner padding — séparateur bord à bord. */
const LIST_CARD_INSET_X = spacing[4];

function MaquetteCardBlock({
  apt,
  role,
  status,
}: {
  apt: Appointment;
  role: RdvListCardViewerRole;
  status: string;
}) {
  const styles = useThemedStyles(buildStyles);
  const creneau = rdvMaquetteTimeLabel(apt);
  const maskIdentity = role === 'demande';
  const counterparty = maskIdentity
    ? maskOfferCounterparty(rdvMaquetteAvatarCounterparty(apt, role))
    : rdvMaquetteAvatarCounterparty(apt, role);
  const demandeNotes = role === 'demande' ? offerAppointmentNotes(apt) : '';

  return (
    <View style={styles.block}>
      <View style={styles.scheduleRow}>
        <View style={styles.calendarSlot}>
          <MiniDateCalendar
            date={apt.scheduled_at}
            size={LIST_CARD_CALENDAR_SIZE}
            variant="brand"
            accessibilityHidden
          />
        </View>
        <View style={styles.mainCol}>
          <RdvListCardCreneauRow label={creneau} status={status} />
          <RdvCareTagsRow apt={apt} hideStaffOnlyCares={role === 'patient'} tone="neutral" density="compact" />
        </View>
      </View>

      {counterparty ? (
        <View style={styles.personSection}>
          <RdvListCardPersonRow
            person={counterparty}
            blurred={maskIdentity}
            seed={counterparty.name ?? apt.id}
            size="footer"
          />
        </View>
      ) : null}

      {demandeNotes ? (
        <Text style={styles.demandeNotes} numberOfLines={2}>
          {demandeNotes}
        </Text>
      ) : null}
    </View>
  );
}

function CardNavChevron() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  return (
    <View style={styles.chevronCorner} pointerEvents="none" accessible={false}>
      <ChevronRight size={20} color={c.textSecondary} strokeWidth={2.15} style={styles.chevronIcon} />
    </View>
  );
}

export interface RdvListCardBodyProps {
  row: AppointmentListRow;
  primaryApt: Appointment;
  role?: RdvListCardViewerRole;
  /** @deprecated Utiliser `role`. */
  showPatientName?: boolean;
  statusForApt?: (apt: Appointment) => string;
  footer?: ReactNode;
  multiRdvBlocks?: Appointment[];
}

export function RdvListCardBody({
  row,
  primaryApt,
  role: roleProp,
  showPatientName,
  statusForApt,
  multiRdvBlocks,
  footer,
}: RdvListCardBodyProps) {
  useAppColors();
  const styles = useThemedStyles(buildStyles);
  const role: RdvListCardViewerRole =
    roleProp ?? (showPatientName ? 'nurse' : 'patient');

  const resolveStatus =
    statusForApt ?? ((apt: Appointment) => String(apt.status ?? ''));

  const isMergedHomogeneousBatch =
    row.kind === 'batch' && (isBloodTestOnlyBatchRow(row) || isNursingOnlyBatchRow(row));
  const displayApt = isMergedHomogeneousBatch ? displayAppointmentForListRow(row) : primaryApt;
  const lotSummaryLabel =
    isMergedHomogeneousBatch && row.kind === 'batch'
      ? batchLotSummaryLabel(row.appointments)
      : '';

  if (multiRdvBlocks && multiRdvBlocks.length > 0) {
    return (
      <View style={styles.bodyShell}>
        {multiRdvBlocks.map((apt, idx) => (
          <View
            key={apt.id}
            style={[styles.multiWrap, idx > 0 && styles.multiBorder]}
          >
            <MaquetteCardBlock apt={apt} role={role} status={resolveStatus(apt)} />
          </View>
        ))}
        {footer ? <View style={styles.extraFooter}>{footer}</View> : null}
        <CardNavChevron />
      </View>
    );
  }

  return (
    <View style={styles.bodyShell}>
      {lotSummaryLabel ? (
        <Text style={styles.lotSummary} numberOfLines={1}>
          {lotSummaryLabel}
        </Text>
      ) : null}
      <MaquetteCardBlock apt={displayApt} role={role} status={resolveStatus(displayApt)} />
      {footer ? <View style={styles.extraFooter}>{footer}</View> : null}
      <CardNavChevron />
    </View>
  );
}

function buildStyles(c: AppColors) {
  const type = buildRdvListCardTypography(c);
  return {
    bodyShell: {
      position: 'relative' as const,
    },
    lotSummary: {
      ...type.meta,
      color: c.primary,
      marginBottom: spacing[2],
      fontFamily: fontFamily.semiBold,
    },
    block: {},
    personSection: {
      marginTop: spacing[3],
      marginHorizontal: -LIST_CARD_INSET_X,
      paddingTop: spacing[2.5],
      paddingHorizontal: LIST_CARD_INSET_X,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.slate[300],
    },
    scheduleRow: {
      flexDirection: 'row' as const,
      alignItems: 'flex-start' as const,
      gap: spacing[2.5],
    },
    calendarSlot: {
      width: LIST_CARD_CALENDAR_PX,
      height: LIST_CARD_CALENDAR_PX,
      flexGrow: 0,
      flexShrink: 0,
    },
    mainCol: {
      flex: 1,
      minWidth: 0,
      gap: spacing[1.5],
    },
    chevronCorner: {
      position: 'absolute' as const,
      right: 0,
      bottom: 0,
    },
    chevronIcon: {
      opacity: 0.58,
    },
    demandeNotes: {
      ...type.meta,
      fontStyle: 'italic' as const,
      marginTop: spacing[2.5],
    },
    multiWrap: {
      paddingBottom: spacing[2],
    },
    multiBorder: {
      paddingTop: spacing[3],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
    extraFooter: {
      paddingTop: spacing[2.5],
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
      gap: spacing[1],
    },
  };
}
