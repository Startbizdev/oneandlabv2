import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { StatusBadge } from '@/components/ui/Badge';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import {
  type AppointmentListRow,
  batchLotSummaryLabel,
  displayAppointmentForListRow,
  isBloodTestOnlyBatchRow,
  isNursingOnlyBatchRow,
} from '@/utils/appointment-batch';
import { offerAppointmentNotes } from '@/features/appointments/detail/utils/offer-appointment-display';
import { RdvCareTagsRow } from '@/features/appointments/components/RdvCareTagsRow';
import {
  rdvMaquetteAvatarCounterparty,
  rdvMaquetteDayBadge,
  rdvMaquetteFooterCounterparty,
  rdvMaquetteTimeLabel,
  type RdvListCardViewerRole,
  type RdvMaquetteCounterparty,
} from '@/utils/rdv-maquette-card-display';
import { buildRdvListCardTypography } from './rdv-list-card-typography';
import { maskOfferCounterparty } from '@/utils/offer-privacy-display';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const AVATAR = 52;
const LEFT_COL = 72;

function MaquetteFooterPerson({ counterparty }: { counterparty: RdvMaquetteCounterparty | null }) {
  const styles = useThemedStyles(buildStyles);
  if (!counterparty?.name) return null;
  const sub = counterparty.subtitle?.trim();
  return (
    <Text style={styles.footerPersonWrap} numberOfLines={1}>
      <Text style={styles.footerName}>{counterparty.name}</Text>
      {sub ? <Text style={styles.footerRole}>, {sub}</Text> : null}
    </Text>
  );
}

function AvatarColumnName({ counterparty }: { counterparty: RdvMaquetteCounterparty | null }) {
  const styles = useThemedStyles(buildStyles);
  const name = counterparty?.name?.trim();
  if (!name) return null;
  const sub = counterparty?.subtitle?.trim();
  return (
    <View style={styles.avatarNameWrap}>
      <Text style={styles.avatarName} numberOfLines={2}>
        {name}
      </Text>
      {sub ? (
        <Text style={styles.avatarNameSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function CreneauRow({ label }: { label: string }) {
  const styles = useThemedStyles(buildStyles);
  return (
    <Text style={styles.creneau} numberOfLines={1}>
      {label}
    </Text>
  );
}

function MaquetteCardBlock({
  apt,
  role,
  status,
}: {
  apt: Appointment;
  role: RdvListCardViewerRole;
  status: string;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const dayBadge = rdvMaquetteDayBadge(apt.scheduled_at);
  const creneau = rdvMaquetteTimeLabel(apt);
  const maskIdentity = role === 'demande';
  const avatarPerson = maskIdentity
    ? maskOfferCounterparty(rdvMaquetteAvatarCounterparty(apt, role))
    : rdvMaquetteAvatarCounterparty(apt, role);
  const footerPerson = rdvMaquetteFooterCounterparty(apt, role);

  const demandeNotes = role === 'demande' ? offerAppointmentNotes(apt) : '';
  const showNameUnderAvatar = Boolean(avatarPerson?.name?.trim());
  const showFooterPerson =
    !showNameUnderAvatar && role !== 'demande' && Boolean(footerPerson?.name?.trim());

  return (
    <View style={styles.block}>
      <View style={styles.statusCorner}>
        <StatusBadge status={status} size="sm" />
      </View>
      <View style={styles.mainRow}>
        <View style={styles.leftCol}>
          <ProfileAvatar
            profileImageUrl={avatarPerson?.profileImageUrl}
            seed={avatarPerson?.name ?? apt.id}
            gender={avatarPerson?.gender}
            size={AVATAR}
            blurred={maskIdentity}
            style={styles.avatarClip}
          />
          {showNameUnderAvatar ? (
            <AvatarColumnName counterparty={avatarPerson} />
          ) : null}
        </View>

        <View style={styles.mainContentWrap}>
          <View style={styles.contentStack}>
            {dayBadge ? (
              <Text style={styles.dayAboveSlot} numberOfLines={1}>
                {dayBadge}
              </Text>
            ) : null}
            {creneau ? <CreneauRow label={creneau} /> : null}
            <RdvCareTagsRow apt={apt} hideStaffOnlyCares={role === 'patient'} />
            {demandeNotes ? (
              <Text style={styles.demandeNotes} numberOfLines={2}>
                {demandeNotes}
              </Text>
            ) : null}
          </View>
          <ChevronRight
            size={18}
            color={c.textTertiary}
            strokeWidth={2}
            style={styles.chevron}
          />
        </View>
      </View>

      {showFooterPerson ? (
        <View style={styles.cardBottom}>
          <MaquetteFooterPerson counterparty={footerPerson} />
        </View>
      ) : null}
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
      <View style={styles.body}>
        {multiRdvBlocks.map((apt, idx) => (
          <View
            key={apt.id}
            style={[styles.multiWrap, idx > 0 && styles.multiBorder]}
          >
            <MaquetteCardBlock apt={apt} role={role} status={resolveStatus(apt)} />
          </View>
        ))}
        {footer ? <View style={styles.extraFooter}>{footer}</View> : null}
      </View>
    );
  }

  return (
    <View style={styles.body}>
      {lotSummaryLabel ? (
        <Text style={styles.lotSummary} numberOfLines={1}>
          {lotSummaryLabel}
        </Text>
      ) : null}
      <MaquetteCardBlock apt={displayApt} role={role} status={resolveStatus(displayApt)} />
      {footer ? <View style={styles.extraFooter}>{footer}</View> : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  const type = buildRdvListCardTypography(c);
  return {
  body: {
    gap: 0,
  },
  lotSummary: {
    ...type.meta,
    color: c.primary,
    marginBottom: spacing[1],
    fontFamily: fontFamily.semiBold,
  },
  block: {
    gap: spacing[2],
    position: 'relative',
  },
  statusCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    paddingRight: 2,
    minHeight: 76,
  },
  leftCol: {
    width: LEFT_COL,
    alignItems: 'center',
    gap: spacing[1.5],
    flexShrink: 0,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  dayAboveSlot: {
    alignSelf: 'flex-start',
    ...type.day,
    textTransform: 'capitalize',
  },
  avatarClip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderLight,
  },
  avatarNameWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 1,
    paddingHorizontal: 2,
  },
  avatarName: {
    ...type.patientName,
    textAlign: 'center',
  },
  avatarNameSub: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * 1.35,
    color: c.textTertiary,
    textAlign: 'center',
  },
  mainContentWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing[1],
  },
  contentStack: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  chevron: {
    opacity: 0.45,
    flexShrink: 0,
    alignSelf: 'center',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing[2],
    paddingTop: spacing[2],
    marginTop: spacing[0.5],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  creneau: {
    alignSelf: 'stretch',
    ...type.slot,
  },
  demandeNotes: {
    ...type.meta,
    fontStyle: 'italic',
  },
  footerPersonWrap: {
    flexShrink: 0,
    maxWidth: '52%',
    textAlign: 'right',
  },
  footerName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
  },
  footerRole: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  multiWrap: {
    paddingBottom: spacing[1.5],
  },
  multiBorder: {
    paddingTop: spacing[2.5],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  extraFooter: {
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
    gap: spacing[1],
  },
};
}
