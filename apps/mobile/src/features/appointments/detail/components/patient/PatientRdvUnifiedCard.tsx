import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { api } from '@/api/client';
import { StatusBadge } from '@/components/ui/Badge';
import {
  buildAppointmentDetailKvRows,
  isAppointmentCanceled,
} from '@/utils/appointment-detail-display';
import { StaffPatientKvSection } from '../StaffPatientKvSection';
import { RdvCancellationBanner } from '../RdvCancellationBanner';
import { DetailInfoStack } from '../layout/DetailInfoStack';
import { DetailSection } from '../layout/DetailSection';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function actTitle(appt: Appointment, index: number): string {
  if (isBloodTestAppointment(appt.type)) return `Prélèvement #${index + 1}`;
  if (isNursingAppointment(appt.type)) return `Soins #${index + 1}`;
  return `Acte #${index + 1}`;
}

function CareStack({
  appt,
  titleContext,
}: {
  appt: Appointment;
  titleContext?: string | null;
}) {
  const items = buildAppointmentDetailKvRows(appt, {
    hideAddress: true,
    hideScheduledDate: true,
    hideCreatedAt: true,
    titleContext,
  })
    .filter((r) => r.value)
    .map((r) => ({
      label: r.label,
      value: r.value,
      muted: Boolean(r.strikethrough),
    }));
  return <DetailInfoStack items={items} />;
}

interface Props {
  primary: Appointment;
  batch: Appointment[];
  isMultiBatch: boolean;
  viewer: AuthUser | null;
  canceled: boolean;
  cancelCount: number;
  onCancel: () => void;
  onScrollToReviews?: () => void;
  /** Patient + adresse déjà dans le hero */
  withHero?: boolean;
  /** Détails soin déjà dans RdvAppointmentInfoSection */
  hideCareDetails?: boolean;
}

export function PatientRdvUnifiedCard({
  primary,
  batch,
  isMultiBatch,
  viewer,
  canceled,
  cancelCount,
  onCancel,
  onScrollToReviews,
  withHero = false,
  hideCareDetails = false,
}: Props) {
  const titleContext = primary.category_name ?? null;
  const extraContacts = withHero ? (
    <StaffPatientKvSection apt={primary} />
  ) : null;

  const reviewable = batch.filter((a) => a.status === 'completed');
  const reviewsQ = useQuery({
    queryKey: ['reviews', 'patient-unified', reviewable.map((a) => a.id).join(',')] as const,
    queryFn: async () => {
      const out: Record<string, boolean> = {};
      for (const appt of reviewable) {
        const res = await api.get<{ id?: string }[]>(
          `/reviews?appointment_id=${encodeURIComponent(appt.id)}`,
        );
        out[appt.id] = Boolean(res.data?.[0]);
      }
      return out;
    },
    enabled: reviewable.length > 0,
  });

  const anyWithoutReview = reviewable.some((a) => !reviewsQ.data?.[a.id]);

  const careBlock = hideCareDetails ? null : !isMultiBatch ? (
    <CareStack appt={primary} titleContext={titleContext} />
  ) : (
    batch.map((appt, idx) => (
      <View key={appt.id} style={idx > 0 ? styles.actBorder : undefined}>
        <View style={styles.actHead}>
          <Text style={styles.actTitle}>{actTitle(appt, idx)}</Text>
          <StatusBadge status={appt.status} size="sm" />
        </View>
        {isAppointmentCanceled(appt.status) ? (
          <RdvCancellationBanner apt={appt} compact />
        ) : null}
        <CareStack appt={appt} titleContext={appt.category_name ?? titleContext} />
      </View>
    ))
  );

  const hasCare =
    !hideCareDetails &&
    (!isMultiBatch
      ? buildAppointmentDetailKvRows(primary, {
          hideAddress: true,
          hideScheduledDate: true,
          hideCreatedAt: true,
          titleContext,
        }).some((r) => r.value)
      : true);

  const actionItems: { key: string; label: string; onPress: () => void }[] = [];
  if (!canceled) {
    if (anyWithoutReview || reviewable.length > 0) {
      actionItems.push({
        key: 'review',
        label: anyWithoutReview ? 'Laisser un avis' : 'Voir mes avis',
        onPress: () => onScrollToReviews?.(),
      });
    }
    if (cancelCount > 0) {
      actionItems.push({
        key: 'cancel',
        label:
          cancelCount > 1 ? 'Annuler les rendez-vous du lot' : 'Annuler le rendez-vous',
        onPress: onCancel,
      });
    }
  }

  if (!extraContacts && !hasCare && actionItems.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <DetailSection title="Prise en charge" plain>
        {extraContacts}
        {hasCare ? careBlock : null}
      </DetailSection>

      {!canceled && actionItems.length > 0 ? (
        <View style={styles.actions}>
          {actionItems.map((a) => (
            <Pressable key={a.key} onPress={a.onPress} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  actionBtn: {
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  actionBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
});
