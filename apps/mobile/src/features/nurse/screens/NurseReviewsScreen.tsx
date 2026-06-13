import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import {
  EMPTY_AVIS_IMAGE,
  EMPTY_AVIS_IMAGE_HEIGHT,
  EMPTY_AVIS_IMAGE_WIDTH,
} from '@/constants/empty-state-images';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/skeletons';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { ReviewFilterChips } from '@/features/reviews/components/ReviewFilterChips';
import { ReviewReceivedCard } from '@/features/reviews/components/ReviewReceivedCard';
import { ReviewReplySheet } from '@/features/reviews/components/ReviewReplySheet';
import { ReviewStatsBanner } from '@/features/reviews/components/ReviewStatsBanner';
import type { Review, ReviewFilter, ReviewStats } from '@/features/reviews/types';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function filterReviews(list: Review[], filter: ReviewFilter): Review[] {
  if (filter === 'pending') return list.filter((r) => !r.response?.trim());
  if (filter === 'answered') return list.filter((r) => Boolean(r.response?.trim()));
  return list;
}

export function NurseReviewsScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_nurse_screens_NurseReviewsScreen_tsx_NurseReviewsScreen_styles');

  const user = useAuthStore((s) => s.user);
  const { show: toast } = useToast();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  const reviewsQ = useQuery({
    queryKey: queryKeys.reviews.list(user?.id ?? ''),
    queryFn: async () => {
      const res = await api.get<Review[]>(`/reviews?reviewee_id=${user!.id}&limit=100`);
      return res.data ?? [];
    },
    enabled: !!user?.id,
  });

  const statsQ = useQuery({
    queryKey: queryKeys.reviews.stats(user?.id ?? ''),
    queryFn: async () => {
      const res = await api.get<ReviewStats>(`/reviews/stats?reviewee_id=${user!.id}`);
      return res.data ?? null;
    },
    enabled: !!user?.id,
  });

  const respond = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      api.put(`/reviews/${id}/response`, { response }),
    onSuccess: () => {
      toast('Réponse publiée', { type: 'success' });
      setReplyTarget(null);
      setReplyDraft('');
      void qc.invalidateQueries({ queryKey: queryKeys.reviews.list(user?.id ?? '') });
      void qc.invalidateQueries({ queryKey: queryKeys.reviews.stats(user?.id ?? '') });
    },
    onError: (e) => handleApiError(e, toast, 'reviewResponse'),
  });

  const allReviews = reviewsQ.data ?? [];
  const filtered = useMemo(() => filterReviews(allReviews, filter), [allReviews, filter]);

  const counts = useMemo(
    () => ({
      all: allReviews.length,
      pending: allReviews.filter((r) => !r.response?.trim()).length,
      answered: allReviews.filter((r) => Boolean(r.response?.trim())).length,
    }),
    [allReviews],
  );

  const openReply = (review: Review) => {
    setReplyTarget(review);
    setReplyDraft('');
  };

  const ListHeader = () => (
    <View style={styles.headerBlock}>
      {statsQ.data && statsQ.data.total_reviews > 0 ? (
        <ReviewStatsBanner stats={statsQ.data} />
      ) : null}
      {allReviews.length > 0 ? (
        <>
          <Text style={styles.sectionHint}>
            Les patients partagent leur expérience après un soin. Répondez pour rassurer et valoriser
            votre profil.
          </Text>
          <ReviewFilterChips value={filter} onChange={setFilter} counts={counts} />
        </>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {reviewsQ.isLoading ? (
        <View style={styles.loading}>
          <SkeletonList count={4} itemHeight={120} gap={12} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={reviewsQ.isRefetching}
              onRefresh={() => {
                void reviewsQ.refetch();
                void statsQ.refetch();
              }}
              tintColor={c.primary}
            />
          }
          ListHeaderComponent={ListHeader}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(280).springify()}>
              <ReviewReceivedCard review={item} onReply={item.response?.trim() ? undefined : () => openReply(item)} />
            </Animated.View>
          )}
          ListEmptyComponent={
            allReviews.length === 0 ? (
              <EmptyState
                title="Aucun avis disponible"
                description="Il n'y a pas encore d'avis. Dès qu'un patient laissera une note après un soin, elle s'affichera ici."
                imageSource={EMPTY_AVIS_IMAGE}
                imageWidth={EMPTY_AVIS_IMAGE_WIDTH}
                imageHeight={EMPTY_AVIS_IMAGE_HEIGHT}
              />
            ) : (
              <View style={styles.filterEmpty}>
                <Text style={styles.filterEmptyTitle}>
                  {filter === 'pending' ? 'Aucun avis en attente' : 'Aucun avis répondu'}
                </Text>
                <Text style={styles.filterEmptyDesc}>
                  Changez de filtre pour voir les autres avis.
                </Text>
              </View>
            )
          }
        />
      )}

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
          if (!replyTarget || !replyDraft.trim()) return;
          respond.mutate({ id: replyTarget.id, response: replyDraft.trim() });
        }}
        submitting={respond.isPending}
      />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  loading: { padding: spacing[4], paddingTop: spacing[2] },
  list: {
    minWidth: 0,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  headerBlock: {
    gap: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  sectionHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  separator: { height: spacing[3] },
  filterEmpty: {
    alignItems: 'center' as const,
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  filterEmptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  filterEmptyDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textTertiary,
    textAlign: 'center' as const,
  },
};
}
