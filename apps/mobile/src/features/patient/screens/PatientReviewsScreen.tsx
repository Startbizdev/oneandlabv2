import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  EMPTY_AVIS_IMAGE,
  EMPTY_AVIS_IMAGE_HEIGHT,
  EMPTY_AVIS_IMAGE_WIDTH,
} from '@/constants/empty-state-images';
import { SkeletonList } from '@/components/ui/skeletons';
import { api } from '@/api/client';
import {
  flattenInfiniteAppointments,
  useInfiniteAppointmentsList,
} from '@/features/appointments/hooks/use-infinite-appointments-list';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { ReviewGivenCard } from '@/features/reviews/components/ReviewGivenCard';
import { ReviewStars } from '@/features/reviews/components/ReviewStars';
import type { Review } from '@/features/reviews/types';
import { enrichReviewsWithAppointmentProfiles } from '@/features/reviews/utils/enrich-reviews-with-profiles';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const PATIENT_APPOINTMENTS_FILTERS = {
  limit: APPOINTMENTS_LIST_PAGE_SIZE,
} as const;

function PatientReviewsSummary({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  const withRating = reviews.filter((r) => r.rating != null);
  const avg =
    withRating.length > 0
      ? withRating.reduce((s, r) => s + (r.rating ?? 0), 0) / withRating.length
      : 0;

  return (
    <View style={summaryStyles.wrap}>
      <View style={summaryStyles.left}>
        <Text style={summaryStyles.count}>{reviews.length}</Text>
        <Text style={summaryStyles.countLabel}>
          {reviews.length > 1 ? 'avis laissés' : 'avis laissé'}
        </Text>
      </View>
      {withRating.length > 0 ? (
        <View style={summaryStyles.right}>
          <Text style={summaryStyles.avgLabel}>Note moyenne donnée</Text>
          <ReviewStars rating={avg} size={16} />
        </View>
      ) : null}
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    gap: spacing[3],
  },
  left: { gap: 2 },
  count: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['3xl'],
    color: colors.primary,
    letterSpacing: -0.5,
  },
  countLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  right: { alignItems: 'flex-end', gap: spacing[1] },
  avgLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
});

export function PatientReviewsScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);

  const reviewsQ = useQuery({
    queryKey: queryKeys.reviews.patientList(userId ?? ''),
    queryFn: async () => {
      const res = await api.get<Review[]>(`/reviews?patient_id=${encodeURIComponent(userId!)}&limit=100`);
      if (!res.success) throw new Error(res.error);
      return res.data ?? [];
    },
    enabled: !!userId,
  });

  const appointmentsQ = useInfiniteAppointmentsList(PATIENT_APPOINTMENTS_FILTERS);
  const appointmentPages = useMemo(
    () => flattenInfiniteAppointments(appointmentsQ.data?.pages),
    [appointmentsQ.data?.pages],
  );

  const reviews = useMemo(
    () => enrichReviewsWithAppointmentProfiles(reviewsQ.data ?? [], appointmentPages),
    [reviewsQ.data, appointmentPages],
  );
  const listData = useMemo(() => reviews, [reviews]);
  const isLoading = reviewsQ.isLoading;
  const isRefetching = reviewsQ.isRefetching || appointmentsQ.isRefetching;

  const refetch = () => {
    void reviewsQ.refetch();
    void appointmentsQ.refetch();
  };

  const ListHeader = () => (
    <View style={styles.headerBlock}>
      <Text style={styles.intro}>
        Retrouvez les notes et commentaires que vous avez partagés après vos rendez-vous.
      </Text>
      <PatientReviewsSummary reviews={reviews} />
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loading}>
          <SkeletonList count={3} itemHeight={130} gap={12} />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * 45).duration(280).springify()}>
              <ReviewGivenCard review={item} />
            </Animated.View>
          )}
          ListHeaderComponent={ListHeader}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              title="Aucun avis disponible"
              description="Il n'y a pas encore d'avis. Après un rendez-vous terminé, vous pourrez noter votre expérience."
              imageSource={EMPTY_AVIS_IMAGE}
              imageWidth={EMPTY_AVIS_IMAGE_WIDTH}
              imageHeight={EMPTY_AVIS_IMAGE_HEIGHT}
              actionLabel="Voir mes rendez-vous"
              onAction={() => router.push('/(patient)/(tabs)/appointments' as never)}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { padding: spacing[4] },
  list: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  headerBlock: {
    gap: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  intro: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  separator: { height: spacing[3] },
});
