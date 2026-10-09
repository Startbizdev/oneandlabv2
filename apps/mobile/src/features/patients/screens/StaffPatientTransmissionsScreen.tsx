import { useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { NotebookPen } from 'lucide-react-native';
import type { PatientTransmission } from '@oneandlab/shared-types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { AppointmentListSectionHeader } from '@/features/appointments/components/AppointmentListSectionHeader';
import { queryKeys } from '@/lib/query-keys';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
import { fetchPatientTransmissions } from '../api/patient-transmissions.service';
import { TransmissionCard } from '../components/TransmissionCard';
import { TransmissionEntrySheet } from '../components/TransmissionEntrySheet';
import { transmissionDaySections } from '../utils/transmission-feed';

type Entry = { transmission: PatientTransmission | null };

/** Fil des transmissions d'un patient, partagé par l'équipe soignante (infirmier / pro). */
export function StaffPatientTransmissionsScreen() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = id ?? '';
  const [entry, setEntry] = useState<Entry | null>(null);

  const feedQ = useInfiniteQuery({
    queryKey: queryKeys.patients.transmissions(patientId),
    queryFn: ({ pageParam }) => fetchPatientTransmissions(patientId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_before ?? undefined,
    enabled: Boolean(patientId),
  });

  const sections = useMemo(
    () => transmissionDaySections(feedQ.data?.pages.flatMap((page) => page.items) ?? []),
    [feedQ.data],
  );
  const openNew = () => setEntry({ transmission: null });

  if (feedQ.isLoading) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <SkeletonList count={3} itemHeight={132} gap={spacing[3]} />
        </View>
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl refreshing={feedQ.isRefetching} onRefresh={() => void feedQ.refetch()} tintColor={c.primary} />
        }
        ListHeaderComponent={
          sections.length > 0 ? <Button title="Nouvelle transmission" fullWidth onPress={openNew} /> : null
        }
        renderSectionHeader={({ section }) => <AppointmentListSectionHeader label={section.title} />}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <TransmissionCard transmission={item} onEdit={(transmission) => setEntry({ transmission })} />
          </View>
        )}
        onEndReachedThreshold={0.4}
        onEndReached={() => {
          if (feedQ.hasNextPage && !feedQ.isFetchingNextPage) void feedQ.fetchNextPage();
        }}
        ListFooterComponent={feedQ.isFetchingNextPage ? <ActivityIndicator color={c.primary} /> : null}
        ListEmptyComponent={
          feedQ.isError ? (
            <ErrorState
              title="Transmissions indisponibles"
              error={feedQ.error}
              onRetry={() => void feedQ.refetch()}
            />
          ) : (
            <EmptyState
              Icon={NotebookPen}
              title="Aucune transmission"
              description="Notez l'évolution et les soins réalisés pour toute l'équipe soignante."
              actionLabel="Nouvelle transmission"
              onAction={openNew}
            />
          )
        }
      />

      <TransmissionEntrySheet
        visible={entry !== null}
        onClose={() => setEntry(null)}
        patientId={patientId}
        transmission={entry?.transmission}
      />
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    loading: {
      minWidth: 0,
      flex: 1,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      backgroundColor: c.background,
    },
    list: {
      minWidth: 0,
      flexGrow: 1,
      gap: spacing[1],
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[10],
      backgroundColor: c.background,
    },
    item: { paddingBottom: spacing[3] },
  };
}
