import { Fragment, useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StaffHubPatientItem, StaffHubSearchItem } from '@oneandlab/shared-types';
import { useScreenFabScrollClearance } from '@/components/ui/ScreenFab';
import { SceneScrollView } from '@/components/navigation/SceneScrollView';
import { queryKeys } from '@/lib/query-keys';
import { deletePatient } from '../api/patients.service';
import { fetchStaffPatientHubSearch } from '../api/staff-hub-search.service';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { DeletePatientConfirmSheet } from '../components/DeletePatientConfirmSheet';
import {
  StaffPatientActionsSheet,
  type StaffPatientActionTarget,
} from '../components/StaffPatientActionsSheet';
import { SkeletonPatientList } from '@/components/ui/skeletons';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { useToast } from '@/providers/ToastProvider';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { CreatePatientModal } from '../components/CreatePatientModal';
import { StaffPatientHubListRow } from '../components/StaffPatientHubListRow';
import { staffHubItemRoute } from '../utils/staff-hub-navigation';
import { useAuthStore } from '@/store/auth-store';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { iconSize, radius, spacing, AppText, useStyles, type Theme } from '@/theme';

interface Props {
  rolePrefix?: '/(nurse)' | '/(pro)';
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
}

/** Hub Patients infirmier / pro : recherche patients, proches, documents et échanges. */
export function PatientsListScreen({
  rolePrefix = '/(nurse)',
  createOpen,
  onCreateOpenChange: setCreateOpen,
}: Props) {
  const styles = useStyles(buildStyles);
  const fabClearance = useScreenFabScrollClearance();
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const role = rolePrefix === '/(pro)' ? 'pro' : 'nurse';

  const { show: toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const hasQuery = search.trim().length > 0;

  const hubQ = useQuery({
    queryKey: queryKeys.patients.hubSearch(debouncedSearch.trim()),
    queryFn: async () => {
      const res = await fetchStaffPatientHubSearch(debouncedSearch.trim());
      if (!res.success) throw new Error(res.error ?? 'Recherche impossible');
      return res.data?.items ?? [];
    },
    staleTime: 15_000,
  });

  const items = hubQ.data ?? [];
  const { refreshing, onRefresh } = useManualRefresh(hubQ.refetch);

  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const removeMut = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      setPendingDelete(null);
      void qc.invalidateQueries({ queryKey: queryKeys.patients.all });
      toast('Patient supprimé', { type: 'success' });
    },
    onError: (e) => {
      setPendingDelete(null);
      handleApiError(e, toast, 'deletePatient');
    },
  });

  const [menuTarget, setMenuTarget] = useState<StaffPatientActionTarget | null>(null);

  const openPatientMenu = useCallback(
    (p: StaffHubPatientItem) => {
      setMenuTarget({
        patientId: p.patient_id,
        name: `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() || 'Patient',
        canDelete: p.created_by != null && p.created_by === userId,
      });
    },
    [userId],
  );

  const openProfile = useCallback(
    ({ patientId }: StaffPatientActionTarget) => {
      const params = { id: patientId };
      router.push(
        role === 'pro'
          ? { pathname: '/(pro)/patient/[id]', params }
          : { pathname: '/(nurse)/patient/[id]', params },
      );
    },
    [router, role],
  );

  const createAppointment = useCallback(
    ({ patientId }: StaffPatientActionTarget) => {
      const params = { patient_id: patientId };
      router.push(
        role === 'pro'
          ? { pathname: '/(pro)/appointments/new', params }
          : { pathname: '/(nurse)/appointments/new', params },
      );
    },
    [router, role],
  );

  const onItemPress = useCallback(
    (item: StaffHubSearchItem) => {
      router.push(staffHubItemRoute(item, role));
    },
    [router, role],
  );

  const countLabel = hasQuery
    ? `${items.length} résultat${items.length > 1 ? 's' : ''}`
    : `${items.length} patient${items.length > 1 ? 's' : ''}`;

  return (
    <View style={styles.screen}>
      <SceneScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing[4] + fabClearance }]}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <AppointmentsListFilterBar
          embedded
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Patient, document, échange…"
        />

        {hubQ.isLoading ? (
          <SkeletonPatientList count={8} />
        ) : hubQ.isError && !hubQ.data ? (
          <View style={styles.emptyWrap}>
            <ErrorState title="Patients indisponibles" error={hubQ.error} onRetry={() => void hubQ.refetch()} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyWrap}>
            {hasQuery ? (
              <EmptyState illustration="search" title="Aucun résultat" description="Essayez un autre nom ou mot-clé." />
            ) : (
              <EmptyState
                illustration="patients"
                title="Aucun patient"
                description="Ajoutez un patient pour gérer ses rendez-vous et documents."
                actionLabel="Ajouter un patient"
                onAction={() => setCreateOpen(true)}
              />
            )}
          </View>
        ) : (
          <View style={styles.listSection}>
            <AppText variant="secondary" style={styles.count}>
              {countLabel}
            </AppText>
            <View style={styles.listCard}>
              {items.map((item, index) => (
                <Fragment key={item.id}>
                  {index > 0 ? <View style={styles.rowDivider} /> : null}
                  <StaffPatientHubListRow
                    item={item}
                    onPress={() => onItemPress(item)}
                    onLongPress={item.kind === 'patient' ? () => openPatientMenu(item) : undefined}
                  />
                </Fragment>
              ))}
            </View>
          </View>
        )}
      </SceneScrollView>

      <CreatePatientModal
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void qc.invalidateQueries({ queryKey: queryKeys.patients.all });
        }}
      />

      <StaffPatientActionsSheet
        target={menuTarget}
        onClose={() => setMenuTarget(null)}
        onOpenProfile={openProfile}
        onCreateAppointment={createAppointment}
        onDelete={({ patientId, name }) => setPendingDelete({ id: patientId, name })}
      />

      <DeletePatientConfirmSheet
        patientName={pendingDelete?.name ?? null}
        loading={removeMut.isPending}
        onConfirm={() => {
          if (pendingDelete) removeMut.mutate(pendingDelete.id);
        }}
        onClose={() => setPendingDelete(null)}
      />
    </View>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    screen: {
      minWidth: 0,
      flex: 1,
      backgroundColor: c.background,
    },
    listContent: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      flexGrow: 1,
    },
    listSection: {
      gap: spacing[2],
    },
    count: {
      paddingHorizontal: spacing[1],
    },
    listCard: {
      width: '100%' as const,
      alignSelf: 'stretch' as const,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
      overflow: 'hidden' as const,
    },
    rowDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
      marginLeft: spacing[4] + iconSize['2xl'] + spacing[3],
    },
    emptyWrap: {
      minWidth: 0,
      flexGrow: 1,
      justifyContent: 'center' as const,
      paddingVertical: spacing[6],
    },
  };
}
