import { useMemo, useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { useToast } from '@/providers/ToastProvider';
import { isReviewResponseConflict, reviewResponseErrorMessage } from '@oneandlab/shared-api';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { ReviewFilterChips } from '@/features/reviews/components/ReviewFilterChips';
import { ReviewReceivedCard } from '@/features/reviews/components/ReviewReceivedCard';
import { ReviewReplySheet } from '@/features/reviews/components/ReviewReplySheet';
import { ReviewStatsBanner } from '@/features/reviews/components/ReviewStatsBanner';
import type { Review, ReviewFilter, ReviewStats } from '@/features/reviews/types';
import { scrollChildEntering } from '@/lib/platform/list-entering-animation';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { H_PADDING, spacing, AppText, useStyles } from '@/theme';

function hasResponse(review: Review): boolean {
  return Boolean(review.response?.trim());
}

function filterReviews(list: Review[], filter: ReviewFilter): Review[] {
  if (filter === 'pending') return list.filter((r) => !hasResponse(r));
  if (filter === 'answered') return list.filter(hasResponse);
  return list;
}

export function NurseReviewsScreen() {
  const styles = useStyles(buildStyles);
  const userId = useAuthStore((s) => s.user?.id ?? '');
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  const reviewsQ = useQuery({
    queryKey: queryKeys.reviews.list(userId),
    queryFn: async () => {
      const res = await api.get<Review[]>(`/reviews?reviewee_id=${encodeURIComponent(userId)}&limit=100`);
      if (!res.success || !Array.isArray(res.data)) throw new Error(res.error || 'Impossible de charger les avis.');
      return res.data;
    },
    enabled: Boolean(userId),
  });

  const statsQ = useQuery({
    queryKey: queryKeys.reviews.stats(userId),
    queryFn: async () => {
      const res = await api.get<ReviewStats>(`/reviews/stats?reviewee_id=${encodeURIComponent(userId)}`);
      return res.data ?? null;
    },
    enabled: Boolean(userId),
  });

  const closeReplyAndRefresh = () => {
    setReplyTarget(null);
    setReplyDraft('');
    void qc.invalidateQueries({ queryKey: queryKeys.reviews.list(userId) });
    void qc.invalidateQueries({ queryKey: queryKeys.reviews.stats(userId) });
  };

  const respond = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const result = await api.put(`/reviews/${id}/response`, { response });
      if (!result.success) throw new Error(result.error || 'Envoi impossible. Votre réponse est conservée.');
      return result;
    },
    onSuccess: () => {
      toast('Réponse publiée', { type: 'success' });
      closeReplyAndRefresh();
    },
    onError: (e) => {
      handleApiError(e, toast, 'reviewResponse', undefined, reviewResponseErrorMessage);
      if (e instanceof ApiRequestError && isReviewResponseConflict(e.status, e.code)) closeReplyAndRefresh();
    },
  });

  const allReviews = useMemo(() => reviewsQ.data ?? [], [reviewsQ.data]);
  const filtered = useMemo(() => filterReviews(allReviews, filter), [allReviews, filter]);

  const counts = useMemo(
    () => ({ pending: allReviews.filter((r) => !hasResponse(r)).length }),
    [allReviews],
  );

  const openReply = (review: Review) => {
    setReplyTarget(review);
    setReplyDraft('');
  };

  const refetchAll = async () => {
    const [reviewsResult] = await Promise.all([reviewsQ.refetch(), statsQ.refetch()]);
    return reviewsResult;
  };

  const listHeader =
    allReviews.length > 0 ? (
      <View style={styles.headerBlock}>
        {statsQ.data && statsQ.data.total_reviews > 0 ? <ReviewStatsBanner stats={statsQ.data} /> : null}
        <AppText variant="secondary">Répondre aux avis rassure les futurs patients.</AppText>
        <ReviewFilterChips value={filter} onChange={setFilter} counts={counts} />
      </View>
    ) : null;

  return (
    <StackChromeScreen>
      <QueryFlatList
        query={{
          ...reviewsQ,
          refetch: refetchAll,
        }}
        items={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        skeletonHeight={120}
        ListHeaderComponent={listHeader}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const entering = scrollChildEntering(index, 40, 280);
          const Shell = entering ? Animated.View : View;
          return (
            <Shell entering={entering}>
              <ReviewReceivedCard review={item} onReply={hasResponse(item) ? undefined : () => openReply(item)} />
            </Shell>
          );
        }}
        ListEmptyComponent={
          allReviews.length === 0 ? (
            <EmptyState
              title="Pas encore d’avis"
              description="Les notes laissées par vos patients après un soin s’afficheront ici."
              illustration="reviews"
            />
          ) : (
            <EmptyState
              title={filter === 'pending' ? 'Aucun avis en attente' : 'Aucun avis répondu'}
              description="Changez de filtre pour voir les autres avis."
            />
          )
        }
      />

      <ReviewReplySheet
        visible={replyTarget != null}
        review={replyTarget}
        draft={replyDraft}
        onChangeDraft={setReplyDraft}
        onClose={() => {
          setReplyTarget(null);
          setReplyDraft('');
        }}
        onSubmit={() => {
          if (respond.isPending || !replyTarget || !replyDraft.trim()) return;
          respond.mutate({ id: replyTarget.id, response: replyDraft.trim() });
        }}
        submitting={respond.isPending}
      />
    </StackChromeScreen>
  );
}

function buildStyles() {
  return {
    list: {
      minWidth: 0,
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[8],
      flexGrow: 1,
    },
    headerBlock: {
      gap: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[3],
    },
    separator: { height: spacing[3] },
  };
}
