import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Star, User } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { api } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import {
  computePreleveurBannerPhase,
  preleveurBannerSubtitle,
  preleveurBannerTitle,
} from '@/utils/preleveur-live-banner';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';
import type { MedicalDocumentRow } from '../api/appointment-detail.service';
import { colors, radius, spacing } from '@/theme';
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

function revieweeType(appt: Appointment): string {
  const t = String(appt.type ?? '');
  if (t === 'nursing' || t === 'nurse') return 'nurse';
  if (appt.assigned_to) return 'preleveur';
  return 'lab';
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
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={8}>
          <Star
            size={28}
            color="#F59E0B"
            fill={n <= rating ? '#FCD34D' : 'transparent'}
            strokeWidth={1.5}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function PatientDetailExtras({ batch, documents, onRefresh }: Props) {
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
      return api.post('/reviews', {
        appointment_id: apptId,
        rating,
        comment: comment.trim() || undefined,
        reviewee_type: revieweeType(appt),
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
        <View key={appt.id} style={[styles.alertCard, phase === 'arrive' && styles.alertArrive]}>
          <User size={20} color={phase === 'arrive' ? colors.success : colors.primary} strokeWidth={2} />
          <View style={styles.alertTexts}>
            <Text style={styles.alertTitle}>{preleveurBannerTitle(appt, phase)}</Text>
            <Text style={styles.alertSub}>{preleveurBannerSubtitle(appt, phase)}</Text>
          </View>
        </View>
      ))}

      {resultats.length > 0 ? (
        <View style={styles.resultatsCard}>
          <Text style={styles.sectionLabel}>Résultats disponibles</Text>
          <Text style={styles.resultatsHint}>
            {resultats.length} document{resultats.length > 1 ? 's' : ''} de résultats — consultez la section Documents.
          </Text>
        </View>
      ) : null}

      {reviewable.length > 0 ? (
        <View style={styles.reviewsCard}>
          <View style={styles.reviewsHeader}>
            <Star size={18} color="#F59E0B" fill="#FCD34D" strokeWidth={1.5} />
            <Text style={styles.sectionLabel}>
              {reviewable.length > 1 ? 'Vos avis' : 'Votre avis'}
            </Text>
          </View>
          {reviewable.map((appt) => {
            const existing = reviewsQ.data?.[appt.id];
            const form = forms[appt.id] ?? { rating: 5, comment: '' };
            if (existing) {
              return (
                <View key={appt.id} style={styles.reviewBlock}>
                  {batch.length > 1 ? (
                    <Text style={styles.reviewApptTitle}>{appt.category_name ?? 'Soin'}</Text>
                  ) : null}
                  <ReviewStars rating={existing.rating ?? 0} size={20} showValue={false} />
                  {existing.comment ? (
                    <Text style={styles.reviewComment}>{existing.comment}</Text>
                  ) : (
                    <Text style={styles.reviewMuted}>Pas de commentaire</Text>
                  )}
                </View>
              );
            }
            return (
              <View key={appt.id} style={styles.reviewBlock}>
                {batch.length > 1 ? (
                  <Text style={styles.reviewApptTitle}>{appt.category_name ?? 'Soin'}</Text>
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
                <Input
                  label="Commentaire (optionnel)"
                  value={form.comment}
                  onChangeText={(t) =>
                    setForms((prev) => ({
                      ...prev,
                      [appt.id]: { ...form, comment: t },
                    }))
                  }
                  multiline
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

const styles = StyleSheet.create({
  wrap: { gap: spacing[3] },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    backgroundColor: '#EFF6FF',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: spacing[4],
  },
  alertArrive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  alertTexts: { flex: 1, gap: 4 },
  alertTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  alertSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  resultatsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    padding: spacing[4],
    gap: spacing[1],
  },
  resultatsHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reviewsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[4],
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  sectionLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  reviewBlock: { gap: spacing[3] },
  reviewApptTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  reviewComment: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  reviewMuted: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing[1],
  },
});
