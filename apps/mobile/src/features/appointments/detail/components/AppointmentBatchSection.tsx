import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { Row } from '@/components/layout/primitives';
import { StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { RdvCancellationBanner } from './RdvCancellationBanner';
import { RdvFieldRows } from './RdvFieldRows';
import { RdvInfoCard } from './RdvInfoCard';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function batchLineTitle(appt: Appointment, index: number, isMulti: boolean): string | null {
  if (!isMulti) return null;
  if (isBloodTestAppointment(appt.type)) return `Prélèvement #${index + 1}`;
  if (isNursingAppointment(appt.type)) return `Soins prévus #${index + 1}`;
  return `Rendez-vous #${index + 1}`;
}

interface Props {
  appointments: Appointment[];
  role: string;
  isMultiBatch: boolean;
}

export function AppointmentBatchSection({ appointments, role, isMultiBatch }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_AppointmentBatchSection_tsx_AppointmentBatchSection_styles');

  if (!isMultiBatch) {
    const apt = appointments[0];
    if (!apt) return null;
    return (
      <>
        <RdvInfoCard apt={apt} />
        <RdvCancellationBanner apt={apt} />
      </>
    );
  }

  return (
    <Card shadow="sm" padding="none">
      <View style={styles.mergedHeader}>
        <AppText style={styles.mergedTitle}>Lot de rendez-vous</AppText>
        <AppText style={styles.mergedSub}>{appointments.length} actes liés</AppText>
      </View>
      {appointments.map((appt, idx) => {
        const title = batchLineTitle(appt, idx, true);
        return (
          <View key={appt.id} style={styles.batchBlock}>
            {title ? (
              <Row justify="between" align="center" gap={spacing[2]} style={styles.batchTitleRow}>
                <AppText style={styles.batchTitle}>{title}</AppText>
                <StatusBadge status={appt.status} size="sm" />
              </Row>
            ) : null}
            <RdvCancellationBanner apt={appt} compact />
            <View style={styles.batchFields}>
              <RdvFieldRows apt={appt} role={role} hideAddress />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function buildStyles(c: AppColors) {
  return {
  mergedHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: c.borderLight,
    gap: 2,
  },
  mergedTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  mergedSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
  },
  batchBlock: {
    borderTopWidth: 1,
    borderTopColor: c.borderLight,
    paddingVertical: spacing[3],
  },
  batchTitleRow: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  batchTitle: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  batchFields: {
    paddingHorizontal: spacing[2],
  },
};
}
