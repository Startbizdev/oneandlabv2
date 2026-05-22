import { StyleSheet, Text, View } from 'react-native';
import { Stethoscope } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import type { AuthUser } from '@oneandlab/shared-types';
import { StatusBadge } from '@/components/ui/Badge';
import {
  buildAppointmentDetailKvRows,
  isAppointmentCanceled,
} from '@/utils/appointment-detail-display';
import { RdvCancellationBanner } from './RdvCancellationBanner';
import { StaffPatientKvSection } from './StaffPatientKvSection';
import { PatientAssigneeRows } from './patient/PatientAssigneeRows';
import { DetailInfoStack } from './layout/DetailInfoStack';
import { DetailSection } from './layout/DetailSection';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function actTitle(appt: Appointment, index: number): string {
  if (isBloodTestAppointment(appt.type)) return `Prélèvement #${index + 1}`;
  if (isNursingAppointment(appt.type)) return `Soins prévus #${index + 1}`;
  return `Rendez-vous #${index + 1}`;
}

function CareInfoStack({
  apt,
  titleContext,
  showSchedule = false,
}: {
  apt: Appointment;
  titleContext?: string | null;
  /** Lot multi-RDV : date & créneau par acte */
  showSchedule?: boolean;
}) {
  const rows = buildAppointmentDetailKvRows(apt, {
    hideAddress: true,
    hideScheduledDate: !showSchedule,
    hideCreatedAt: true,
    titleContext,
  }).filter((r) => r.value);

  const items = rows.map((r) => ({
    label: r.label,
    value: r.value,
    muted: Boolean(r.strikethrough),
  }));

  return <DetailInfoStack items={items} />;
}

interface Props {
  batch: Appointment[];
  primary: Appointment;
  isMultiBatch: boolean;
  role: string;
  viewer?: AuthUser | null;
  showPatientRows?: boolean;
  showAssignee?: boolean;
  embedded?: boolean;
}

export function RdvUnifiedInfoCard({
  batch,
  primary,
  isMultiBatch,
  role,
  viewer,
  showPatientRows = true,
  showAssignee = true,
  embedded = false,
}: Props) {
  const titleContext = primary.category_name ?? null;

  if (!isMultiBatch) {
    const canceled = isAppointmentCanceled(primary.status);
    const extraContacts = showPatientRows ? (
      <StaffPatientKvSection apt={primary} />
    ) : null;
    const care = <CareInfoStack apt={primary} titleContext={titleContext} />;
    const hasCare = buildAppointmentDetailKvRows(primary, {
      hideAddress: true,
      hideScheduledDate: true,
      hideCreatedAt: true,
      titleContext,
    }).some((r) => r.value);

    if (!extraContacts && !hasCare && !showAssignee) return null;

    return (
      <View style={styles.wrap}>
        {canceled && !embedded ? (
          <RdvCancellationBanner apt={primary} />
        ) : null}
        <DetailSection title={embedded ? 'Prise en charge' : undefined} plain={embedded}>
          {extraContacts}
          {hasCare ? care : null}
        </DetailSection>
        {showAssignee ? <PatientAssigneeRows apt={primary} /> : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <DetailSection
        title={embedded ? 'Soins du rendez-vous' : 'Actes du lot'}
        Icon={Stethoscope}
        plain={!embedded}
      >
        {showPatientRows ? <StaffPatientKvSection apt={primary} /> : null}
        {batch.map((appt, idx) => (
          <View key={appt.id} style={idx > 0 ? styles.actBorder : undefined}>
            <View style={styles.actHead}>
              <Text style={styles.actTitle}>{actTitle(appt, idx)}</Text>
              <StatusBadge status={appt.status} size="sm" />
            </View>
            {isAppointmentCanceled(appt.status) ? (
              <RdvCancellationBanner apt={appt} compact />
            ) : null}
            <CareInfoStack
              apt={appt}
              titleContext={appt.category_name ?? titleContext}
              showSchedule
            />
          </View>
        ))}
      </DetailSection>
      {showAssignee ? <PatientAssigneeRows apt={primary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[3] },
  actBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: spacing[3],
    marginTop: spacing[3],
  },
  actHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  actTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
  },
});
