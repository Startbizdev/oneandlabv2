import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { useAuthStore } from '@/store/auth-store';
import { fetchStaffPatientHistoryAppointments } from '../api/patient-profile.service';
import { useStaffPatientProfile } from '../hooks/use-staff-patient-profile';
import { enrichPatientHistoryAppointments } from '../utils/enrich-patient-history-appointments';
import { spacing, useStyles, type Theme } from '@/theme';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import type { StaffRoutePrefix } from '@/navigation/role-route-prefix';

interface Props {
  rolePrefix: StaffRoutePrefix;
}

/** Rendez-vous passés d'un patient (vue infirmier / pro). */
export function StaffPatientHistoryScreen({ rolePrefix }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = id ?? '';
  const router = useRouter();
  const viewerId = useAuthStore((s) => s.user?.id);
  const listRole = rolePrefix === '/(pro)' ? 'pro' : 'nurse';

  const profileQ = useStaffPatientProfile(patientId);

  const historyQ = useQuery({
    queryKey: queryKeys.patients.history(patientId),
    queryFn: async () => {
      const { appointments } = await fetchStaffPatientHistoryAppointments(patientId);
      return appointments;
    },
    enabled: Boolean(patientId),
  });

  const displayRows = useMemo(
    () =>
      buildAppointmentDisplayRows(enrichPatientHistoryAppointments(historyQ.data ?? [], profileQ.data), {
        direction: 'past',
        groupMode: 'batch',
      }),
    [historyQ.data, profileQ.data],
  );

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => (
      <AppointmentListRowCard
        row={row}
        index={index}
        role={listRole}
        viewerId={viewerId}
        onPress={(apt) => router.push(appointmentDetailHref(rolePrefix, apt.id))}
      />
    ),
    [listRole, rolePrefix, router, viewerId],
  );

  if (historyQ.isLoading || profileQ.isLoading) {
    return (
      <StackChromeScreen>
        <View style={styles.loading}>
          <SkeletonList count={4} itemHeight={116} gap={spacing[3]} />
        </View>
      </StackChromeScreen>
    );
  }

  if (profileQ.isError) {
    return (
      <StackChromeScreen>
        <ErrorState
          title="Patient introuvable"
          error={profileQ.error}
          onRetry={() => void profileQ.refetch()}
        />
      </StackChromeScreen>
    );
  }

  return (
    <StackChromeScreen>
      <FlatList
        data={displayRows}
        keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={historyQ.isRefetching || profileQ.isRefetching}
            onRefresh={() => {
              void historyQ.refetch();
              void profileQ.refetch();
            }}
            tintColor={c.primary}
          />
        }
        renderItem={renderItem}
        ListEmptyComponent={
          historyQ.isError ? (
            <ErrorState
              title="Historique indisponible"
              error={historyQ.error}
              onRetry={() => void historyQ.refetch()}
            />
          ) : (
            <EmptyState illustration="history" title="Aucun rendez-vous passé" />
          )
        }
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
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[10],
      flexGrow: 1,
      backgroundColor: c.background,
    },
  };
}
