import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup } from '@/components/ui/Skeleton';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { AppointmentCard } from '@/features/appointments/components/AppointmentCard';
import { fetchAppointmentsPaginated } from '@/features/appointments/api/appointments.service';
import { useAppointmentDetail } from '@/features/appointments/hooks/use-appointment-detail';
import { PatientPaginationBar } from '../detail/components/patient/PatientPaginationBar';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const PAGE_SIZE = 8;
const PAST_STATUSES = 'completed,canceled,cancelled,refused,expired';

export function PatientAppointmentHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);

  const detailQ = useAppointmentDetail(id);
  const primary = detailQ.data;
  const relativeId = (primary as Appointment & { relative_id?: string })?.relative_id ?? null;

  const historyQ = useQuery({
    queryKey: ['patient', 'appointment-history', id, relativeId] as const,
    queryFn: async () => {
      const { appointments } = await fetchAppointmentsPaginated({
        page: 1,
        limit: 120,
        status: PAST_STATUSES,
      });
      let filtered = appointments.filter((a) => a.id !== id);
      if (relativeId) {
        filtered = filtered.filter(
          (a) =>
            String((a as Appointment & { relative_id?: string }).relative_id ?? '') ===
            relativeId,
        );
      }
      return filtered.sort((a, b) => {
        const da = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
        const db = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
        return db - da;
      });
    },
    enabled: Boolean(id && primary),
    staleTime: 60_000,
  });

  const allItems = historyQ.data ?? [];
  const pages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const items = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const subtitle = useMemo(() => {
    const rel = (primary as Appointment & { relative?: { first_name?: string; last_name?: string } })
      ?.relative;
    if (relativeId && rel) {
      const r = rel;
      const name = [r.first_name, r.last_name].filter(Boolean).join(' ');
      return name ? `Rendez-vous passés pour ${name}` : 'Rendez-vous passés pour ce proche';
    }
    return 'Vos rendez-vous passés';
  }, [relativeId, primary]);

  const ListFooter = useMemo(
    () =>
      allItems.length > PAGE_SIZE ? (
        <PatientPaginationBar
          page={page}
          pages={pages}
          total={allItems.length}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(pages, p + 1))}
        />
      ) : null,
    [allItems.length, page, pages],
  );

  if (detailQ.isPending && !primary) {
    return (
      <View style={styles.container}>
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Historique</Text>
          <Text style={styles.introSub}>Chargement…</Text>
        </View>
        <View style={styles.loading}>
          <SkeletonGroup count={4} height={88} gap={10} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Historique</Text>
        <Text style={styles.introSub}>{subtitle}</Text>
      </View>

      <QueryFlatList
        query={historyQ}
        items={items}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        skeletonHeight={88}
        ListFooterComponent={ListFooter}
        renderItem={({ item, index }) => (
          <AppointmentCard
            appointment={item}
            index={index}
            onPress={() => router.push(`/(patient)/appointment/${item.id}` as never)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <EmptyState
            Icon={History}
            title="Aucun historique"
            description="Les rendez-vous passés apparaîtront ici."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  intro: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    gap: spacing[1],
  },
  introTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xl,
    color: colors.textPrimary,
  },
  introSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  list: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
  sep: { height: spacing[2] },
  loading: { paddingHorizontal: spacing[4], flex: 1 },
});
