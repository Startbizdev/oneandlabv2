import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useMemo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  EMPTY_AVIS_IMAGE,
  EMPTY_AVIS_IMAGE_HEIGHT,
  EMPTY_AVIS_IMAGE_WIDTH,
} from '@/constants/empty-state-images';
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
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { scrollChildEntering } from '@/lib/platform/list-entering-animation';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { Row } from '@/components/layout/primitives';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const PATIENT_APPOINTMENTS_FILTERS = {
  limit: APPOINTMENTS_LIST_PAGE_SIZE,
} as const;

function PatientReviewsSummary({ reviews }: { reviews: Review[] }) {
  const summaryStyles = useThemedStyles(buildSummaryStyles, 'PatientReviewsSummary');
  if (reviews.length === 0) return null;
  const withRating = reviews.filter((r) => r.rating != null);
  const avg =
    withRating.length > 0
      ? withRating.reduce((s, r) => s + (r.rating ?? 0), 0) / withRating.length
      : 0;

  return (
    <Row justify="between" align="center" gap={spacing[3]} style={summaryStyles.wrap}>
      <View style={summaryStyles.left}>
        <AppText style={summaryStyles.count}>{reviews.length}</AppText>
        <AppText style={summaryStyles.countLabel}>
          {reviews.length > 1 ? 'avis laissés' : 'avis laissé'}
        </AppText>
      </View>
      {withRating.length > 0 ? (
        <View style={summaryStyles.right}>
          <AppText style={summaryStyles.avgLabel}>Note moyenne donnée</AppText>
          <ReviewStars rating={avg} size={iconSize.sm} />
        </View>
      ) : null}
    </Row>
  );
}

function buildSummaryStyles(c: AppColors) {
  return {
  wrap: {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.borderLight,
    padding: spacing[4],
  },
  left: { gap: 2 },
  count: {
    fontFamily: fontFamily.extraBold,
    fontSize: fontSize['3xl'],
    color: c.primary,
    letterSpacing: -0.5,
  },
  countLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  right: { alignItems: 'flex-end' as const, gap: spacing[1] },
  avgLabel: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
};
}

export function PatientReviewsScreen() {
  const styles = useThemedStyles(buildScreenStyles, 'PatientReviewsScreen');
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

  const refetchAll = async () => {
    const [reviewsResult] = await Promise.all([reviewsQ.refetch(), appointmentsQ.refetch()]);
    return reviewsResult;
  };

  const ListHeader = () => (
    <View style={styles.headerBlock}>
      <AppText style={styles.intro}>
        Retrouvez les notes et commentaires que vous avez partagés après vos rendez-vous.
      </AppText>
      <PatientReviewsSummary reviews={reviews} />
    </View>
  );

  return (
    <StackChromeScreen>
      <QueryFlatList
        query={{
          ...reviewsQ,
          refetch: refetchAll,
        }}
        items={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        skeletonHeight={130}
        ListHeaderComponent={ListHeader}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const entering = scrollChildEntering(index, 45, 280);
          const Shell = entering ? Animated.View : View;
          return (
            <Shell entering={entering}>
              <ReviewGivenCard review={item} />
            </Shell>
          );
        }}
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
    </StackChromeScreen>
  );
}

function buildScreenStyles(c: AppColors) {
  return {
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
    intro: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      lineHeight: fontSize.sm * 1.5,
    },
    separator: { height: spacing[3] },
  };
}
