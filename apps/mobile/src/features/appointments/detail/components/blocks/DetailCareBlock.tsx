import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, Text, View } from 'react-native';
import { Stethoscope } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { Row } from '@/components/layout/primitives';
import { StatusBadge } from '@/components/ui/Badge';
import { DetailPanel } from '../layout/DetailPanel';
import { RdvCancellationBanner } from '../RdvCancellationBanner';
import { RdvFieldRows } from '../RdvFieldRows';
import { RdvKvCard } from '../RdvKvCard';
import {
  getAddressComplement,
  isAppointmentCanceled,
} from '@/utils/appointment-detail-display';
import { appointmentAddressLine } from '@/utils/appointment-display';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function actTitle(appt: Appointment, index: number): string {
  if (isBloodTestAppointment(appt.type)) return `Prélèvement #${index + 1}`;
  if (isNursingAppointment(appt.type)) return `Soins #${index + 1}`;
  return `Acte #${index + 1}`;
}

interface Props {
  batch: Appointment[];
  primary: Appointment;
  isMultiBatch: boolean;
  role: string;
  /** Adresse affichée dans un bloc séparé (pros) — pas dans les KV. */
  addressInLocationBlock: boolean;
}

export function DetailCareBlock({
  batch,
  primary,
  isMultiBatch,
  role,
  addressInLocationBlock,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_blocks_DetailCareBlock_tsx_DetailCareBlock_styles');

  if (!isMultiBatch) {
    const canceled = isAppointmentCanceled(primary.status);
    return (
      <>
        {canceled ? <RdvCancellationBanner apt={primary} /> : null}
        <DetailPanel title="Détails du soin" Icon={Stethoscope}>
          <RdvFieldRows
            apt={primary}
            role={role}
            hideAddress={addressInLocationBlock}
            hideScheduledDate
          />
        </DetailPanel>
      </>
    );
  }

  const sharedAddress = appointmentAddressLine(primary);
  const complement = getAddressComplement(primary);

  return (
    <DetailPanel
      title="Détails des soins"
      subtitle={`${batch.length} rendez-vous dans ce lot`}
      Icon={Stethoscope}
      noPadding
    >
      {batch.map((appt, idx) => (
        <View key={appt.id} style={styles.act}>
          <Row justify="between" align="center" gap={spacing[2]} style={styles.actHead}>
            <Text style={styles.actTitle}>{actTitle(appt, idx)}</Text>
            <StatusBadge status={appt.status} size="sm" />
          </Row>
          {isAppointmentCanceled(appt.status) ? (
            <View style={styles.actCancel}>
              <RdvCancellationBanner apt={appt} compact />
            </View>
          ) : null}
          <View style={styles.actBody}>
            <RdvFieldRows apt={appt} role={role} hideAddress hideScheduledDate={false} />
          </View>
        </View>
      ))}
      {!addressInLocationBlock && sharedAddress ? (
        <View style={styles.sharedFooter}>
          <RdvKvCard
            rows={[
              { label: 'Adresse commune', value: sharedAddress },
              ...(complement ? [{ label: 'Complément', value: complement }] : []),
            ]}
          />
        </View>
      ) : null}
    </DetailPanel>
  );
}

function buildStyles(c: AppColors) {
  return {
  act: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  actHead: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  actTitle: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  actCancel: { paddingHorizontal: spacing[4], paddingBottom: spacing[2] },
  actBody: { paddingHorizontal: spacing[2], paddingBottom: spacing[3] },
  sharedFooter: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
};
}
