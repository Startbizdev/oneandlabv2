import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react-native';
import { queryKeys } from '@/lib/query-keys';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup } from '@/components/ui/Skeleton';
import { AppointmentCard } from '@/features/appointments/components/AppointmentCard';
import { PatientPaginationBar } from '@/features/appointments/detail/components/patient/PatientPaginationBar';
import { fetchPatientHistory, fetchPatientProfile } from '../api/patient-profile.service';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const PAGE_SIZE = 8;

interface Props {
  rolePrefix: '/(nurse)' | '/(pro)';
}

export function StaffPatientHistoryScreen({ rolePrefix }: Props) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState(1);

  const profileQ = useQuery({
    queryKey: queryKeys.profile.user(id ?? ''),
    queryFn: async () => {
      const res = await fetchPatientProfile(id!);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Patient introuvable');
      return res.data;
    },
    enabled: Boolean(id),
  });

  const historyQ = useQuery({
    queryKey: queryKeys.patients.history(id ?? ''),
    queryFn: async () => {
      const res = await fetchPatientHistory(id!);
      return res.data ?? [];
    },
    enabled: Boolean(id),
  });

  const allItems = historyQ.data ?? [];
  const pages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
  const items = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const name =
    `${profileQ.data?.first_name ?? ''} ${profileQ.data?.last_name ?? ''}`.trim() || 'ce patient';

  return (
    <View style={styles.container}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Historique</Text>
        <Text style={styles.introSub}>Rendez-vous passés pour {name}</Text>
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
              onPress={() => router.push(`${rolePrefix}/appointment/${item.id}` as never)}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <EmptyState
              Icon={History}
              title="Aucun historique"
              description="Aucun rendez-vous enregistré pour ce patient."
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
