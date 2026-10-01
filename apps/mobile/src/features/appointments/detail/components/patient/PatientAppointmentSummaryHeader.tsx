import { View } from 'react-native';
import { CalendarDays, Clock, UserRound } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { Row } from '@/components/layout/primitives';
import { StatusBadge } from '@/components/ui/Badge';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { appointmentDaySectionLabel } from '@/utils/appointment-list-sections';
import { beneficiaryDisplayName } from '@/utils/beneficiary-display-name';
import { formatFrenchWeekdayDate } from '@/utils/appointment-datetime-fr';
import { appointmentStatusForDisplay } from '@/utils/effective-appointment-status';
import {
  rdvMaquetteActsLine,
  rdvMaquetteAvatarCounterparty,
  rdvMaquetteTimeLabel,
} from '@/utils/rdv-maquette-card-display';
import { useAppColors } from '@/theme/use-app-colors';
import { AppText, avatarSize, iconSize, radius, spacing, useStyles, font, type Theme } from '@/theme';

interface Props {
  apt: Appointment;
  batchCount?: number;
  /** Le soignant attribué est déjà présenté plus bas (détail du rendez-vous). */
  assigneeShownElsewhere?: boolean;
}

function dateLine(apt: Appointment): string {
  if (!apt.scheduled_at) return 'Date à confirmer';
  const relative = appointmentDaySectionLabel(apt.scheduled_at);
  const full = formatFrenchWeekdayDate(apt.scheduled_at, 'dddd D MMMM YYYY');
  return relative === "Aujourd'hui" || relative === 'Demain' ? `${relative} · ${full}` : full;
}

/** Bandeau patient : soin, statut en clair, date, créneau et soignant attribué. */
export function PatientAppointmentSummaryHeader({ apt, batchCount = 1, assigneeShownElsewhere = false }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const status = appointmentStatusForDisplay(apt, { role: 'patient' });
  const assignee = rdvMaquetteAvatarCounterparty(apt, 'patient');
  const title = rdvMaquetteActsLine(apt, 'patient');
  const assigned = !!assignee && !assignee.assignmentPending;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <StatusBadge status={status} size="md" />
        <AppText style={styles.title} accessibilityRole="header">
          {title}
        </AppText>
        {apt.relative_id ? (
          <AppText style={styles.meta}>{`Pour ${beneficiaryDisplayName(apt)}`}</AppText>
        ) : null}
        {batchCount > 1 ? (
          <AppText style={styles.meta}>{`${batchCount} rendez-vous liés`}</AppText>
        ) : null}
      </View>

      <View style={styles.lines}>
        <Row gap={spacing[2.5]} align="center">
          <CalendarDays size={iconSize.sm} color={c.primaryDark} strokeWidth={2} />
          <AppText style={styles.lineText}>{dateLine(apt)}</AppText>
        </Row>
        <Row gap={spacing[2.5]} align="center">
          <Clock size={iconSize.sm} color={c.primaryDark} strokeWidth={2} />
          <AppText style={styles.lineText}>{rdvMaquetteTimeLabel(apt)}</AppText>
        </Row>
      </View>

      {assigned && assigneeShownElsewhere ? null : (
      <View style={styles.assignee}>
        {assigned && assignee ? (
          <Row gap={spacing[3]} align="center">
            <ProfileAvatar
              profileImageUrl={assignee.profileImageUrl ?? null}
              seed={assignee.avatarSeed || assignee.name || apt.id}
              gender={assignee.gender ?? null}
              size={avatarSize.sm}
            />
            <View style={styles.assigneeText}>
              <AppText style={styles.assigneeName} numberOfLines={1}>
                {assignee.name}
              </AppText>
              <AppText style={styles.meta}>{assignee.subtitle}</AppText>
            </View>
          </Row>
        ) : (
          <Row gap={spacing[3]} align="center">
            <View style={styles.pendingIcon}>
              <UserRound size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />
            </View>
            <AppText style={[styles.meta, styles.assigneeText]}>
              Nous recherchons un soignant disponible. Vous serez prévenu dès son attribution.
            </AppText>
          </Row>
        )}
      </View>
      )}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
      gap: spacing[4],
    },
    head: {
      gap: spacing[2],
    },
    title: {
      ...font.heading,
      fontSize: fontSize.xl,
      lineHeight: Math.round(fontSize.xl * 1.25),
      color: c.textPrimary,
    },
    lines: {
      gap: spacing[2],
    },
    lineText: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
      flex: 1,
      minWidth: 0,
    },
    assignee: {
      paddingTop: spacing[3],
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    assigneeText: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    assigneeName: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    meta: {
      ...font.regular,
      fontSize: fontSize.sm,
      lineHeight: Math.round(fontSize.sm * 1.4),
      color: c.textSecondary,
    },
    pendingIcon: {
      width: avatarSize.sm,
      height: avatarSize.sm,
      borderRadius: radius.full,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  };
}
