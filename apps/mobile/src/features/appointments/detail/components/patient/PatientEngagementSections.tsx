import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Star, User, FileCheck, XCircle } from 'lucide-react-native';
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
import type { MedicalDocumentRow } from '../../api/appointment-detail.service';
import {
  PatientListCard,
  PatientListRow,
  PatientRowValue,
} from './PatientListPrimitives';
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
            size={26}
            color="#F59E0B"
            fill={n <= rating ? '#FCD34D' : 'transparent'}
            strokeWidth={1.5}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function PatientPreleveurAlerts({ batch }: { batch: Appointment[] }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const alerts = useMemo(
    () =>
      batch
        .map((appt) => {
          const phase = computePreleveurBannerPhase(appt, now);
          if (phase === 'hidden') return null;
          return { appt, phase };
        })
        .filter(Boolean) as { appt: Appointment; phase: 'en_route' | 'arrive' }[],
    [batch, now],
  );

  if (!alerts.length) return null;

  return (
    <>
      {alerts.map(({ appt, phase }) => (
        <View
          key={appt.id}
          style={[styles.alertCard, phase === 'arrive' && styles.alertArrive]}
        >
          <User
            size={20}
            color={phase === 'arrive' ? colors.success : colors.primary}
            strokeWidth={2}
          />
          <View style={styles.alertTexts}>
            <Text style={styles.alertTitle}>{preleveurBannerTitle(appt, phase)}</Text>
            <Text style={styles.alertSub}>{preleveurBannerSubtitle(appt, phase)}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

export function PatientFooterActions({
  batch,
  documents,
  canceled,
  cancelCount,
  onCancel,
  onScrollToReviews,
  onScrollToDocuments,
}: {
  batch: Appointment[];
  documents: MedicalDocumentRow[];
  canceled: boolean;
  cancelCount: number;
  onCancel: () => void;
  onScrollToReviews?: () => void;
  onScrollToDocuments?: () => void;
}) {
  const resultats = documents.filter((d) => d.document_type === 'resultats');
  const reviewable = batch.filter(canLeaveReview);
  const completed = batch.filter((a) => a.status === 'completed');

  const reviewsQ = useQuery({
    queryKey: ['reviews', 'patient-footer', reviewable.map((a) => a.id).join(',')] as const,
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

  const anyWithoutReview = reviewable.some((a) => !reviewsQ.data?.[a.id]);
  const anyWithReview = reviewable.some((a) => reviewsQ.data?.[a.id]);
  const isMulti = batch.length > 1;

  if (canceled) return null;

  const rows: { label: string; node: ReactNode; last?: boolean }[] = [];

  if (resultats.length > 0) {
    rows.push({
      label: 'Résultats',
      node: (
        <Pressable onPress={onScrollToDocuments} style={styles.actionBtn}>
          <FileCheck size={16} color={colors.primary} strokeWidth={2} />
          <Text style={styles.actionBtnText}>Voir les résultats</Text>
        </Pressable>
      ),
    });
  }

  if (anyWithoutReview || anyWithReview) {
    rows.push({
      label: 'Avis',
      node: (
        <Pressable onPress={onScrollToReviews} style={styles.actionBtn}>
          <Star size={16} color="#F59E0B" fill="#FCD34D" strokeWidth={1.5} />
          <Text style={styles.actionBtnText}>
            {anyWithoutReview
              ? 'Laisser un avis'
              : isMulti
                ? 'Voir mes avis'
                : 'Voir mon avis'}
          </Text>
        </Pressable>
      ),
    });
  }

  if (cancelCount > 0) {
    rows.push({
      label: 'Annulation',
      last: true,
      node: (
        <Pressable onPress={onCancel} style={[styles.actionBtn, styles.actionBtnDanger]}>
          <XCircle size={16} color={colors.error} strokeWidth={2} />
          <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>
            {cancelCount > 1 ? 'Annuler les rendez-vous du lot' : 'Annuler le rendez-vous'}
          </Text>
        </Pressable>
      ),
    });
  }

  if (!rows.length && !completed.length) return null;

  return (
    <PatientListCard title="Actions">
      {rows.map((r, i) => (
        <PatientListRow key={r.label} label={r.label} last={r.last ?? i === rows.length - 1}>
          {r.node}
        </PatientListRow>
      ))}
    </PatientListCard>
  );
}

export function PatientReviewsSection({
  batch,
  onRefresh,
  sectionRef,
}: {
  batch: Appointment[];
  onRefresh: () => void;
  sectionRef?: RefObject<View | null>;
}) {
  const { show: toast } = useToast();
  const [forms, setForms] = useState<Record<string, { rating: number; comment: string }>>({});

  const reviewable = batch.filter(canLeaveReview);

  const reviewsQ = useQuery({
    queryKey: ['reviews', 'patient-section', reviewable.map((a) => a.id).join(',')] as const,
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

  const submitReview = useMutation({
    mutationFn: async ({
      apptId,
      rating,
      comment,
    }: {
      apptId: string;
      rating: number;
      comment: string;
    }) => {
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

  if (!reviewable.length) return null;

  return (
    <View ref={sectionRef} collapsable={false}>
      <PatientListCard title={reviewable.length > 1 ? 'Vos avis' : 'Votre avis'} Icon={Star}>
        {reviewable.map((appt, idx) => {
          const existing = reviewsQ.data?.[appt.id];
          const form = forms[appt.id] ?? { rating: 5, comment: '' };
          return (
            <View
              key={appt.id}
              style={[styles.reviewBlock, idx > 0 && styles.reviewBlockBorder]}
            >
              {batch.length > 1 ? (
                <Text style={styles.reviewApptTitle}>{appt.category_name ?? 'Soin'}</Text>
              ) : null}
              {existing ? (
                <>
                  <ReviewStars rating={existing.rating ?? 0} size={20} showValue={false} />
                  {existing.comment ? (
                    <PatientRowValue text={existing.comment} />
                  ) : (
                    <PatientRowValue text="Pas de commentaire" muted />
                  )}
                </>
              ) : (
                <>
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
                </>
              )}
            </View>
          );
        })}
      </PatientListCard>
    </View>
  );
}

const styles = StyleSheet.create({
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
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    backgroundColor: colors.primaryLight,
  },
  actionBtnDanger: {
    backgroundColor: '#FEF2F2',
  },
  actionBtnText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
  },
  actionBtnTextDanger: {
    color: colors.error,
  },
  reviewBlock: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  reviewBlockBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  reviewApptTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing[1],
  },
});
