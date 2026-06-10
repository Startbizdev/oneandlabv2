import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { isBloodTestAppointment, isNursingAppointment } from '@oneandlab/shared-utils';
import { api } from '@/api/client';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { revieweePayloadForCompletedAppt } from '@/utils/reviewee-payload';
import { canLeaveReview } from '@/utils/can-leave-review';

export type ReviewRow = {
  id: string;
  appointment_id?: string;
  rating?: number;
  comment?: string;
};

export type ReviewFormState = { rating: number; comment: string };

export function revieweeFirstName(appt: Appointment): string {
  const ext = appt as Record<string, unknown>;
  if (isNursingAppointment(appt.type)) {
    const full = String(ext.assigned_nurse_display_name ?? '').trim();
    const first = full.split(/\s+/).filter(Boolean)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
  }
  if (isBloodTestAppointment(appt.type)) {
    const preleveur = String(ext.assigned_to_display_name ?? '').trim();
    if (preleveur) {
      const first = preleveur.split(/\s+/).filter(Boolean)[0];
      return first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';
    }
    return String(ext.assigned_lab_display_name ?? '').trim();
  }
  return '';
}

export function usePatientReviewPrompt(batch: Appointment[], onRefresh: () => void) {
  const { show: toast } = useToast();
  const [sheetApptId, setSheetApptId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, ReviewFormState>>({});

  const reviewable = useMemo(() => batch.filter(canLeaveReview), [batch]);

  const reviewsQ = useQuery({
    queryKey: ['reviews', 'patient-hero', reviewable.map((a) => a.id).join(',')] as const,
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

  const sheetAppt = sheetApptId ? batch.find((a) => a.id === sheetApptId) ?? null : null;
  const sheetExisting = sheetApptId ? reviewsQ.data?.[sheetApptId] : undefined;
  const sheetForm = sheetApptId ? (forms[sheetApptId] ?? { rating: 5, comment: '' }) : null;

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
      const target = revieweePayloadForCompletedAppt(appt);
      if (!target) throw new Error('Aucun professionnel associé à ce rendez-vous.');
      if (rating < 1 || rating > 5) throw new Error('Choisissez une note entre 1 et 5.');
      return api.post('/reviews', {
        appointment_id: apptId,
        reviewee_id: target.reviewee_id,
        reviewee_type: target.reviewee_type,
        rating,
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: () => {
      void reviewsQ.refetch();
      onRefresh();
      setSheetApptId(null);
    },
    onError: (e) => handleApiError(e, toast, 'review'),
  });

  const pendingCount = reviewable.filter((a) => !reviewsQ.data?.[a.id]).length;

  return {
    reviewable,
    reviewsByAppt: reviewsQ.data ?? {},
    pendingCount,
    sheetAppt,
    sheetApptId,
    sheetExisting,
    sheetForm,
    openSheet: setSheetApptId,
    closeSheet: () => setSheetApptId(null),
    setFormRating: (apptId: string, rating: number) => {
      setForms((prev) => ({
        ...prev,
        [apptId]: { ...(prev[apptId] ?? { rating: 5, comment: '' }), rating },
      }));
    },
    setFormComment: (apptId: string, comment: string) => {
      setForms((prev) => ({
        ...prev,
        [apptId]: { ...(prev[apptId] ?? { rating: 5, comment: '' }), comment },
      }));
    },
    submitReview,
  };
}
