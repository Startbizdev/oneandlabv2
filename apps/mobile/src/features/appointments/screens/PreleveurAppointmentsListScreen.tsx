import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import type { Appointment } from '@oneandlab/shared-types';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppointmentsBookCta } from '@/features/appointments/components/AppointmentsBookCta';
import { InfiniteQueryFlatList } from '@/components/ui/InfiniteQueryFlatList';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import { AppointmentsListSearchHost } from '@/features/appointments/components/AppointmentsListFilterBar';
import {
  flattenInfiniteAppointments,
  useInfiniteAppointmentsList,
} from '@/features/appointments/hooks/use-infinite-appointments-list';
import { APPOINTMENTS_LIST_PAGE_SIZE } from '@/constants/appointments-pagination';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { useAuthStore } from '@/store/auth-store';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { appointmentAddressLine } from '@/utils/appointment-display';
import { isAppointmentPastForList } from '@/utils/patient-appointment-list';
import { EMPTY_RDV_IMAGE, EMPTY_RDV_IMAGE_HEIGHT, EMPTY_RDV_IMAGE_WIDTH } from '@/constants/empty-state-images';
import { spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const CONFIRMED_STATUSES = new Set(['confirmed', 'in_progress', 'on_the_way']);

function matchesSearch(apt: Appointment, q: string): boolean {
  const s = q.toLowerCase().trim();
  if (!s) return true;
  const fd = apt.form_data as Record<string, unknown> | undefined;
  const name = `${fd?.first_name ?? ''} ${fd?.last_name ?? ''}`.toLowerCase();
  return (
    name.includes(s) ||
    (apt.category_name ?? '').toLowerCase().includes(s) ||
    appointmentAddressLine(apt).toLowerCase().includes(s)
  );
}

/** Même logique que Tournée — RDV blood_test assignés à ce préleveur, statuts confirmés actifs. */
function isAssignedConfirmed(apt: Appointment, userId: string | undefined): boolean {
  if (!userId) return false;
  if (String(apt.type ?? '') !== 'blood_test') return false;
  if (String(apt.assigned_to ?? '') !== String(userId)) return false;
  return CONFIRMED_STATUSES.has(String(apt.status ?? '').toLowerCase());
}

interface Props {
  detailPathPrefix: string;
  bookHref?: Href;
  bookLabel?: string;
}

export function PreleveurAppointmentsListScreen({ detailPathPrefix, bookHref, bookLabel }: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_screens_PreleveurAppointmentsListScreen_tsx_PreleveurAppointmentsListScreen_styles');

  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState('');

  const query = useInfiniteAppointmentsList({
    limit: APPOINTMENTS_LIST_PAGE_SIZE,
    type: 'blood_test',
    assigned_only: true,
    status: 'confirmed,in_progress,on_the_way',
  });

  const pendingRequestsQuery = useInfiniteAppointmentsList({
    limit: APPOINTMENTS_LIST_PAGE_SIZE,
    type: 'blood_test',
    preleveur_segment: 'mes_demandes',
  });

  const { refetch } = query;
  const { refetch: refetchPendingRequests } = pendingRequestsQuery;

  const pendingRequestRows = useMemo(() => {
    let list = flattenInfiniteAppointments(pendingRequestsQuery.data?.pages);
    if (search.trim()) list = list.filter((a) => matchesSearch(a, search));
    return buildAppointmentDisplayRows(list, { direction: 'upcoming' });
  }, [pendingRequestsQuery.data?.pages, search]);

  const displayRows = useMemo(() => {
    let list = flattenInfiniteAppointments(query.data?.pages).filter(
      (a) => isAssignedConfirmed(a, userId) && !isAppointmentPastForList(a),
    );
    if (search.trim()) list = list.filter((a) => matchesSearch(a, search));
    return buildAppointmentDisplayRows(list, { direction: 'upcoming' });
  }, [query.data?.pages, search, userId]);

  useAppForegroundRefetch(() => {
    void refetch();
    void refetchPendingRequests();
  });

  const openAppointment = useCallback(
    (apt: Appointment) => {
      router.push(`${detailPathPrefix}/${apt.id}` as never);
    },
    [detailPathPrefix, router],
  );

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <AppointmentListRowCard row={row} index={index} role="preleveur" onPress={openAppointment} />
    ),
    [openAppointment],
  );

  const onSearchQueryChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.scrollHeader}>
        <AppointmentsListSearchHost
          embedded
          followedByBookCta={bookHref != null}
          onQueryChange={onSearchQueryChange}
          searchPlaceholder="Nom, adresse, soin…"
        />
        {bookHref != null ? (
          <AppointmentsBookCta href={bookHref} {...(bookLabel != null ? { label: bookLabel } : {})} />
        ) : null}
        {pendingRequestRows.length > 0 ? (
          <View style={styles.pendingSection}>
            <AppText style={styles.sectionTitle}>Demandes en attente de votre labo</AppText>
            {pendingRequestRows.map((row, index) => (
              <AppointmentListRowCard
                key={row.kind === 'batch' ? row.key : row.appointment.id}
                row={row}
                index={index}
                role="preleveur"
                onPress={openAppointment}
              />
            ))}
            <AppText style={styles.sectionTitle}>Missions confirmées</AppText>
          </View>
        ) : null}
      </View>
    ),
    [bookHref, bookLabel, onSearchQueryChange, openAppointment, pendingRequestRows, styles],
  );

  return (
    <View style={styles.container} collapsable={false}>
      <InfiniteQueryFlatList
        query={query}
        items={displayRows}
        renderItem={renderItem}
        keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
        ListHeaderComponent={listHeader}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        skeletonHeight={116}
        ListEmptyComponent={
          !query.isPending ? (
            <EmptyState
              imageSource={EMPTY_RDV_IMAGE}
              imageWidth={EMPTY_RDV_IMAGE_WIDTH}
              imageHeight={EMPTY_RDV_IMAGE_HEIGHT}
              title="Aucun prélèvement pour le moment"
              description="Vos missions confirmées apparaîtront ici."
            />
          ) : null
        }
      />
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  listContent: {
    minWidth: 0,
    paddingHorizontal: spacing[4],
    paddingTop: 0,
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  scrollHeader: {
    marginTop: 0,
    alignSelf: 'stretch' as const,
    width: '100%' as const,
  },
  pendingSection: {
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    paddingHorizontal: spacing[1],
    marginTop: spacing[3],
  },
  listHeaderComponent: {
    paddingTop: 0,
    marginTop: 0,
  },
};
}
