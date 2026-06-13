import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { Row } from '@/components/layout/primitives';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { Appointment, AuthUser } from '@oneandlab/shared-types';
import { api } from '@/api/client';
import { StaffPatientKvSection } from '../StaffPatientKvSection';
import { DetailSection } from '../layout/DetailSection';
import { canLeaveReview } from '@/utils/can-leave-review';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

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
  isMultiBatch: _isMultiBatch,
  viewer: _viewer,
  canceled,
  cancelCount,
  onCancel,
  onScrollToReviews,
  withHero = false,
  hideCareDetails: _hideCareDetails = true,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_patient_PatientRdvUnifiedCard_tsx_styles');
  const extraContacts = withHero ? (
    <StaffPatientKvSection apt={primary} />
  ) : null;

  const reviewable = batch.filter(canLeaveReview);
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

  if (!extraContacts && actionItems.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {extraContacts ? (
        <DetailSection title="Prise en charge" plain>
          {extraContacts}
        </DetailSection>
      ) : null}

      {!canceled && actionItems.length > 0 ? (
        <Row wrap gap={spacing[2]}>
          {actionItems.map((a) => (
            <Pressable key={a.key} onPress={a.onPress} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>{a.label}</Text>
            </Pressable>
          ))}
        </Row>
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[3] },
  actionBtn: {
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[2.5],
    borderRadius: radius.full,
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  actionBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primary,
  },
};
}

