import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Star, User } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { api } from '@/api/client';
import { Cluster, Row } from '@/components/layout/primitives';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { revieweePayloadForCompletedAppt } from '@/utils/reviewee-payload';
import {
  computePreleveurBannerPhase,
  preleveurBannerSubtitle,
  preleveurBannerTitle,
} from '@/utils/preleveur-live-banner';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';
import type { MedicalDocumentRow } from '../api/appointment-detail.service';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type ReviewRow = {
  id: string;
  appointment_id?: string;
  rating?: number;
  comment?: string;
};

function canLeaveReview(appt: Appointment): boolean {
  if (appt.status !== 'completed') return false;
  const t = String(appt.type ?? '');
  if (t === 'nursing' || t === 'nurse') return !!appt.assigned_nurse_id;
  if (t === 'blood_test') return !!(appt.assigned_lab_id || appt.assigned_to);
  return false;
}

interface Props {
  batch: Appointment[];
  documents: MedicalDocumentRow[];
  onRefresh: () => void;
}

function InteractiveStars({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (n: number) => void;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PatientDetailExtras');
  return (
    <Row wrap gap={spacing[1]}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={8}>
          <Star
            size={iconSize.xl}
            color={c.star}
            fill={n <= rating ? c.starFill : 'transparent'}
            strokeWidth={1.5}
          />
        </Pressable>
      ))}
    </Row>
  );
}

export function PatientDetailExtras({
  batch, documents, onRefresh }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_detail_components_PatientDetailExtras_tsx_styles');
  const { show: toast } = useToast();
  const [now, setNow] = useState(Date.now());
  const [forms, setForms] = useState<Record<string, { rating: number; comment: string }>>({});

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const resultats = documents.filter((d) => d.document_type === 'resultats');
  const completed = batch.filter((a) => a.status === 'completed');
  const reviewable = completed.filter(canLeaveReview);

  const reviewsQ = useQuery({
    queryKey: ['reviews', 'batch', reviewable.map((a) => a.id).join(',')] as const,
    queryFn: async () => {
      const out: Record<string, ReviewRow> = {};
      for (const appt of reviewable) {
        const res = await api.get<ReviewRow[]>(
          `/reviews?appointment_id=${encodeURIComponent(appt.id)}`,
        );
        const first = res.data?.[0];
        if (first) out[appt.id] = first;
      }
      return out;
    },
    enabled: reviewable.length > 0,
  });

  const preleveurAlerts = useMemo(() => {
    return batch
      .map((appt) => {
        const phase = computePreleveurBannerPhase(appt, now);
        if (phase === 'hidden') return null;
        return { appt, phase };
      })
      .filter(Boolean) as { appt: Appointment; phase: 'en_route' | 'arrive' }[];
  }, [batch, now]);

  const submitReview = useMutation({
    mutationFn: async ({ apptId, rating, comment }: { apptId: string; rating: number; comment: string }) => {
      const appt = batch.find((a) => a.id === apptId);
      if (!appt) throw new Error('RDV introuvable');
      const target = revieweePayloadForCompletedAppt(appt);
      if (!target) {
        throw new Error('Aucun professionnel associé à ce rendez-vous.');
      }
      if (rating < 1 || rating > 5) {
        throw new Error('Choisissez une note entre 1 et 5.');
      }
      return api.post('/reviews', {
        appointment_id: apptId,
        reviewee_id: target.reviewee_id,
        reviewee_type: target.reviewee_type,
        rating,
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast('Merci pour votre avis', { type: 'success' });
      void reviewsQ.refetch();
      onRefresh();
    },
    onError: (e) => handleApiError(e, toast, 'review'),
  });

  const hasContent =
    preleveurAlerts.length > 0 ||
    resultats.length > 0 ||
    reviewable.length > 0 ||
    completed.some((a) => !isAppointmentCanceled(a.status));

  if (!hasContent) return null;

  return (
    <View style={styles.wrap}>
      {preleveurAlerts.map(({ appt, phase }) => (
        <Cluster
          key={appt.id}
          gap={spacing[3]}
          align="start"
          style={[styles.alertCard, phase === 'arrive' && styles.alertArrive]}
          leading={
            <User size={iconSize.md} color={phase === 'arrive' ? c.success : c.primary} strokeWidth={2} />
          }
        >
          <View style={styles.alertTexts}>
            <AppText style={styles.alertTitle}>{preleveurBannerTitle(appt, phase)}</AppText>
            <AppText style={styles.alertSub}>{preleveurBannerSubtitle(appt, phase)}</AppText>
          </View>
        </Cluster>
      ))}

      {resultats.length > 0 ? (
        <View style={styles.resultatsCard}>
          <AppText style={styles.sectionLabel}>Résultats disponibles</AppText>
          <AppText style={styles.resultatsHint}>
            {resultats.length} document{resultats.length > 1 ? 's' : ''} de résultats — consultez la section Documents.
          </AppText>
        </View>
      ) : null}

      {reviewable.length > 0 ? (
        <View style={styles.reviewsCard}>
          <Row gap={spacing[2]} align="center">
            <Star size={iconSize.mdSm} color={c.star} fill={c.starFill} strokeWidth={1.5} />
            <AppText style={styles.sectionLabel}>
              {reviewable.length > 1 ? 'Vos avis' : 'Votre avis'}
            </AppText>
          </Row>
          {reviewable.map((appt) => {
            const existing = reviewsQ.data?.[appt.id];
            const form = forms[appt.id] ?? { rating: 5, comment: '' };
            if (existing) {
              return (
                <View key={appt.id} style={styles.reviewBlock}>
                  {batch.length > 1 ? (
                    <AppText style={styles.reviewApptTitle}>{appt.category_name ?? 'Soin'}</AppText>
                  ) : null}
                  <ReviewStars rating={existing.rating ?? 0} size={iconSize.md} showValue={false} />
                  {existing.comment ? (
                    <AppText style={styles.reviewComment}>{existing.comment}</AppText>
                  ) : (
                    <AppText style={styles.reviewMuted}>Pas de commentaire</AppText>
                  )}
                </View>
              );
            }
            return (
              <View key={appt.id} style={styles.reviewBlock}>
                {batch.length > 1 ? (
                  <AppText style={styles.reviewApptTitle}>{appt.category_name ?? 'Soin'}</AppText>
                ) : null}
                <InteractiveStars
                  rating={form.rating}
                  onChange={(r) =>
                    setForms((prev) => ({
                      ...prev,
                      [appt.id]: { ...form, rating: r },
                    }))
                  }
                />
                <Textarea
                  label="Commentaire (optionnel)"
                  hint="Précisez l'accueil, la ponctualité ou la qualité des soins."
                  value={form.comment}
                  onChangeText={(t) =>
                    setForms((prev) => ({
                      ...prev,
                      [appt.id]: { ...form, comment: t },
                    }))
                  }
                  placeholder="Ex. : professionnel à l'écoute, soin effectué avec douceur…"
                />
                <Button
                  title="Publier mon avis"
                  size="sm"
                  loading={submitReview.isPending}
                  onPress={() =>
                    submitReview.mutate({
                      apptId: appt.id,
                      rating: form.rating,
                      comment: form.comment,
                    })
                  }
                />
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[3] },
  alertCard: {
    backgroundColor: c.primaryLight,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.primaryMid,
    padding: spacing[4],
  },
  alertArrive: {
    backgroundColor: c.successLight,
    borderColor: c.successMid,
  },
  alertTexts: { gap: 4 },
  alertTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  alertSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textSecondary,
    lineHeight: 18,
  },
  resultatsCard: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.primaryMid,
    padding: spacing[4],
    gap: spacing[1],
  },
  resultatsHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  reviewsCard: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
    gap: spacing[4],
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  reviewBlock: { gap: spacing[3] },
  reviewApptTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  reviewComment: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: 20,
  },
  reviewMuted: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
};
}

