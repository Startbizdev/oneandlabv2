import { StyleSheet, Text, View } from 'react-native';
import { Stethoscope } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { StatusBadge } from '@/components/ui/Badge';
import { useAppointmentCareCategories } from '@/features/appointments/detail/hooks/use-appointment-care-categories';
import {
  buildAppointmentDetailKvRows,
  isAppointmentCanceled,
} from '@/utils/appointment-detail-display';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { RdvCancellationBanner } from '../RdvCancellationBanner';
import {
  PatientListCard,
  PatientListRow,
  PatientRowValue,
} from './PatientListPrimitives';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function actTitle(appt: Appointment, index: number): string {
  if (isBloodTestAppointment(appt.type)) return `Prélèvement #${index + 1}`;
  if (isNursingAppointment(appt.type)) return `Soins #${index + 1}`;
  return `Acte #${index + 1}`;
}

function KvRows({
  apt,
  last,
  categories,
}: {
  apt: Appointment;
  last?: boolean;
  categories?: CareCategory[];
}) {
  const rows = buildAppointmentDetailKvRows(apt, {
    hideAddress: false,
    hideScheduledDate: true,
    categories,
  }).filter((r) => r.value);

  if (!rows.length) return null;

  return (
    <>
      {rows.map((r, i) => (
        <PatientListRow
          key={`${apt.id}-${r.label}`}
          label={r.label}
          last={last && i === rows.length - 1}
        >
          <PatientRowValue
            text={r.value}
            muted={Boolean(r.strikethrough)}
          />
        </PatientListRow>
      ))}
    </>
  );
}

interface Props {
  batch: Appointment[];
  isMultiBatch: boolean;
}

export function PatientCareSection({ batch, isMultiBatch }: Props) {
  const categoriesQ = useAppointmentCareCategories();
  const categories = categoriesQ.data;

  if (!isMultiBatch) {
    const apt = batch[0];
    if (!apt) return null;
    return (
      <View style={styles.wrap}>
        <RdvCancellationBanner apt={apt} />
        <PatientListCard title="Détails du soin" Icon={Stethoscope}>
          <KvRows apt={apt} last categories={categories} />
        </PatientListCard>
      </View>
    );
  }

  return (
    <PatientListCard
      title="Détails des soins"
      Icon={Stethoscope}
    >
      {batch.map((appt, idx) => (
        <View key={appt.id} style={[styles.act, idx > 0 && styles.actBorder]}>
          <View style={styles.actHead}>
            <Text style={styles.actTitle}>{actTitle(appt, idx)}</Text>
            <StatusBadge status={appt.status} size="sm" />
          </View>
          {isAppointmentCanceled(appt.status) ? (
            <View style={styles.actCancel}>
              <RdvCancellationBanner apt={appt} compact />
            </View>
          ) : null}
          <KvRows apt={appt} last={idx === batch.length - 1} categories={categories} />
        </View>
      ))}
    </PatientListCard>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[3] },
  act: { paddingBottom: spacing[1] },
  actBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
    paddingTop: spacing[2],
  },
  actHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  actTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  actCancel: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
});
