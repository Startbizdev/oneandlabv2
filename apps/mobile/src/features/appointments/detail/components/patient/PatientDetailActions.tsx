import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, XCircle } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { api } from '@/api/client';
import { DetailActionList, type DetailActionItem } from '../layout/DetailActionList';
import { canLeaveReview } from '@/utils/can-leave-review';

interface Props {
  batch: Appointment[];
  canceled: boolean;
  cancelCount: number;
  onCancel: () => void;
  onScrollToReviews?: () => void;
  edgeToEdge?: boolean;
}

export function PatientDetailActions({
  batch,
  canceled,
  cancelCount,
  onCancel,
  onScrollToReviews,
  edgeToEdge = true,
}: Props) {
  const reviewable = batch.filter(canLeaveReview);

  const reviewsQ = useQuery({
    queryKey: ['reviews', 'patient-detail-actions', reviewable.map((a) => a.id).join(',')] as const,
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

  const actions = useMemo((): DetailActionItem[] => {
    const items: DetailActionItem[] = [];

    if (!canceled && reviewable.length > 0) {
      items.push({
        key: 'review',
        label: anyWithoutReview ? 'Laisser un avis' : 'Voir mes avis',
        hint: anyWithoutReview
          ? 'Partagez votre expérience après le soin'
          : 'Consulter la note laissée',
        icon: Star,
        tone: 'primary',
        onPress: () => onScrollToReviews?.(),
      });
    }

    if (!canceled && cancelCount > 0) {
      items.push({
        key: 'cancel',
        label:
          cancelCount > 1 ? 'Annuler les rendez-vous du lot' : 'Annuler le rendez-vous',
        hint: 'Action irréversible',
        icon: XCircle,
        tone: 'destructive',
        onPress: onCancel,
        showChevron: false,
      });
    }

    return items;
  }, [anyWithoutReview, cancelCount, canceled, onCancel, onScrollToReviews, reviewable.length]);

  return <DetailActionList actions={actions} edgeToEdge={edgeToEdge} />;
}
