import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup } from '@/components/ui/Skeleton';
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

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Historique</Text>
        <Text style={styles.introSub}>{subtitle}</Text>
      </View>

      {historyQ.isLoading ? (
        <View style={styles.loading}>
          <SkeletonGroup count={4} height={88} gap={10} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={historyQ.isRefetching}
              onRefresh={() => void historyQ.refetch()}
              tintColor={colors.primary}
            />
          }
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
              description="Vous n'avez pas encore d'autres rendez-vous passés pour ce dossier."
            />
          }
          ListFooterComponent={
            allItems.length > 0 ? (
              <View style={styles.footer}>
                <PatientPaginationBar
                  page={page}
                  pages={pages}
                  total={allItems.length}
                  onPrev={() => setPage((p) => Math.max(1, p - 1))}
                  onNext={() => setPage((p) => Math.min(pages, p + 1))}
                />
              </View>
            ) : null
          }
        />
      )}
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
    fontSize: fontSize.lg,
    color: colors.textPrimary,
  },
  introSub: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.45,
  },
  loading: { paddingHorizontal: spacing[4] },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[10], flexGrow: 1 },
  sep: { height: spacing[2] },
  footer: { marginTop: spacing[4] },
});
