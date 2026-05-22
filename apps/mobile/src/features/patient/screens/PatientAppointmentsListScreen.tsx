import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import dayjs from 'dayjs';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { useAppointmentsList } from '@/features/appointments/hooks/use-appointments-list';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { PATIENT_TAB_OPTIONS, type PatientListTab } from '@/constants/appointments-list-filters';
import { colors, spacing } from '@/theme';

const DONE = new Set(['completed', 'canceled', 'cancelled', 'refused']);

function matchesSearch(apt: Appointment, q: string): boolean {
  const s = q.toLowerCase().trim();
  if (!s) return true;
  const fd = apt.form_data as Record<string, unknown> | undefined;
  const name = `${fd?.first_name ?? ''} ${fd?.last_name ?? ''}`.toLowerCase();
  return (
    name.includes(s) ||
    (apt.category_name ?? '').toLowerCase().includes(s) ||
    String(apt.address ?? '').toLowerCase().includes(s)
  );
}

function isUpcoming(apt: Appointment): boolean {
  if (DONE.has(String(apt.status ?? '').toLowerCase())) return false;
  if (!apt.scheduled_at) return true;
  return dayjs(apt.scheduled_at).isAfter(dayjs().subtract(1, 'day'));
}

export function PatientAppointmentsListScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<PatientListTab>('upcoming');
  const [search, setSearch] = useState('');

  const query = useAppointmentsList({ limit: 100 });
  const { data, refetch } = query;

  const filtered = useMemo(() => {
    let list = data ?? [];
    list = list.filter((a) => (tab === 'upcoming' ? isUpcoming(a) : !isUpcoming(a)));
    if (search.trim()) list = list.filter((a) => matchesSearch(a, search));
    return list;
  }, [data, tab, search]);

  const displayRows = useMemo(
    () =>
      buildAppointmentDisplayRows(filtered, {
        direction: tab === 'upcoming' ? 'upcoming' : 'past',
      }),
    [filtered, tab],
  );

  useAppForegroundRefetch(() => { void refetch(); });

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <AppointmentListRowCard
        row={row}
        index={index}
        role="patient"
        onPress={(apt) => router.push(`/(patient)/appointment/${apt.id}` as never)}
      />
    ),
    [router],
  );

  return (
    <View style={styles.container}>
      <QueryFlatList
        query={query}
        items={displayRows}
        header={
          <AppointmentsListFilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Soin, adresse, nom…"
            segmentTabs={PATIENT_TAB_OPTIONS}
            segmentTab={tab}
            onSegmentTabChange={setTab}
          />
        }
        renderItem={renderItem}
        keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            Icon={CalendarDays}
            title={tab === 'upcoming' ? 'Aucun rendez-vous à venir' : 'Aucun rendez-vous passé'}
            description="Réservez un nouveau rendez-vous depuis l’onglet Réserver."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
  },
});
