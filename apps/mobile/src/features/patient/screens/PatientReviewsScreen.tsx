import { useMemo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/api/client';
import {
  flattenInfiniteAppointments,
  useInfiniteAppointmentsList,
} from '@/features/appointments/hooks/use-infinite-appointments-list';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { ReviewGivenCard } from '@/features/reviews/components/ReviewGivenCard';
import type { Review } from '@/features/reviews/types';
import { enrichReviewsWithAppointmentProfiles } from '@/features/reviews/utils/enrich-reviews-with-profiles';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { scrollChildEntering } from '@/lib/platform/list-entering-animation';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { spacing, useStyles } from '@/theme';

const PATIENT_APPOINTMENTS_FILTERS = {
  limit: APPOINTMENTS_LIST_PAGE_SIZE,
} as const;

export function PatientReviewsScreen() {
  const styles = useStyles(buildScreenStyles);
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
            title="Aucun avis"
            description="Après une visite terminée, vous pourrez la noter."
            illustration="reviews"
            actionLabel="Voir mes rendez-vous"
            onAction={() => router.push('/(patient)/(tabs)/appointments')}
          />
        }
      />
    </StackChromeScreen>
  );
}

function buildScreenStyles() {
  return {
    list: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[4],
      paddingBottom: spacing[8],
      flexGrow: 1,
    },
    separator: { height: spacing[3] },
  };
}
