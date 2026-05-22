import { StyleSheet, Text, View } from 'react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { StatusBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { RdvCancellationBanner } from './RdvCancellationBanner';
import { RdvFieldRows } from './RdvFieldRows';
import { RdvInfoCard } from './RdvInfoCard';
import { colors, spacing } from '@/theme';
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
        <Text style={styles.mergedTitle}>Lot de rendez-vous</Text>
        <Text style={styles.mergedSub}>{appointments.length} actes liés</Text>
      </View>
      {appointments.map((appt, idx) => {
        const title = batchLineTitle(appt, idx, true);
        return (
          <View key={appt.id} style={styles.batchBlock}>
            {title ? (
              <View style={styles.batchTitleRow}>
                <Text style={styles.batchTitle}>{title}</Text>
                <StatusBadge status={appt.status} size="sm" />
              </View>
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

const styles = StyleSheet.create({
  mergedHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: 2,
  },
  mergedTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  mergedSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  batchBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingVertical: spacing[3],
  },
  batchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
    gap: spacing[2],
  },
  batchTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  batchFields: {
    paddingHorizontal: spacing[2],
  },
});
