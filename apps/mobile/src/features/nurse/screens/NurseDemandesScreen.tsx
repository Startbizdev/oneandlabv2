import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { isPendingIncomingOffer } from '@oneandlab/shared-utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonGroup } from '@/components/ui/Skeleton';
import { PlanLimitsBanner } from '@/features/nurse/components/PlanLimitsBanner';
import { NurseOfferConfirmSheet } from '@/features/nurse/components/NurseOfferConfirmSheet';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import {
  groupAppointmentsForNurseMesDemandes,
  type AppointmentListRow,
} from '@/utils/appointment-batch';
import { useAppointmentsList } from '@/features/appointments/hooks/use-appointments-list';
import { NURSE_DEMANDES_LIST_FILTERS } from '@/features/nurse/hooks/use-nurse-demandes-badge';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';
import { useAppForegroundRefetch } from '@/lib/hooks/use-network-status';
import { useAuthStore } from '@/store/auth-store';
import { queryKeys } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/providers/ToastProvider';
import {
  acceptOfferBatch,
  refuseOfferBatch,
} from '@/features/nurse/utils/offer-appointment-workflow';
import { colors, spacing } from '@/theme';

type PendingConfirm = { row: AppointmentListRow; count: number };

export function NurseDemandesScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { show: toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useAppointmentsList(NURSE_DEMANDES_LIST_FILTERS);

  const incoming = useMemo(() => {
    const list = data ?? [];
    return list.filter(
      (a) =>
        a.status === 'pending' &&
        isPendingIncomingOffer(a, user?.id) &&
        (a.assigned_nurse_id === user?.id || !a.assigned_nurse_id),
    );
  }, [data, user?.id]);

  const displayRows = useMemo(
    () => groupAppointmentsForNurseMesDemandes(incoming),
    [incoming],
  );

  useAppForegroundRefetch(() => {
    void refetch();
  });

  const invalidateAll = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: queryKeys.appointments.all });
  }, [qc]);

  const showOfferToast = useCallback(
    (kind: 'accept' | 'refuse', result: { count: number; declinedOffer?: boolean }) => {
      if (kind === 'accept') {
        toast(
          result.count > 1 ? `Lot accepté (${result.count} soins)` : 'Rendez-vous accepté !',
          { type: 'success' },
        );
        return;
      }
      if (result.declinedOffer) {
        toast('Proposition retirée — le RDV reste en attente pour le patient.', { type: 'info' });
      } else {
        toast(result.count > 1 ? `Lot refusé (${result.count} soins)` : 'Rendez-vous refusé', {
          type: 'info',
        });
      }
    },
    [toast],
  );

  const handleRefuse = useCallback(
    async (row: AppointmentListRow) => {
      setActionLoading(true);
      const r = await refuseOfferBatch(row, user?.id);
      setActionLoading(false);
      if (!r.ok) {
        toast(r.error, { type: 'error' });
        return;
      }
      showOfferToast('refuse', r);
      await invalidateAll();
      void refetch();
    },
    [invalidateAll, refetch, showOfferToast, toast, user?.id],
  );

  const runAccept = useCallback(
    async (row: AppointmentListRow) => {
      setActionLoading(true);
      const r = await acceptOfferBatch(row, user?.id);
      setActionLoading(false);
      setConfirmOpen(false);
      setPendingConfirm(null);

      if (!r.ok) {
        if (r.planLimit) {
          toast('Limite atteinte — passez à l’offre Pro pour accepter sans limite.', {
            type: 'error',
          });
        } else if (r.alreadyTaken) {
          toast('Ce rendez-vous a déjà été pris par un autre professionnel.', { type: 'info' });
        } else {
          toast(r.error, { type: 'error' });
        }
        await invalidateAll();
        void refetch();
        return;
      }

      showOfferToast('accept', r);
      await invalidateAll();
      void refetch();

      const navId =
        row.kind === 'batch'
          ? [...row.appointments].sort(
              (a, b) =>
                new Date(a.scheduled_at || a.created_at || 0).getTime() -
                new Date(b.scheduled_at || b.created_at || 0).getTime(),
            )[0]?.id
          : row.appointment.id;
      if (navId) router.push(`/(nurse)/appointment/${navId}` as never);
    },
    [invalidateAll, refetch, router, showOfferToast, toast, user?.id],
  );

  const requestAccept = useCallback((row: AppointmentListRow) => {
    const count = row.kind === 'batch' ? row.appointments.length : 1;
    setPendingConfirm({ row, count });
    setConfirmOpen(true);
  }, []);

  const openIncomingOffer = useOfferQueueStore((s) => s.openIncomingOffer);

  const renderItem = useCallback(
    ({ item: row, index }: { item: AppointmentListRow; index: number }) => {
      const aptId =
        row.kind === 'batch'
          ? [...row.appointments].sort(
              (a, b) =>
                new Date(a.scheduled_at || a.created_at || 0).getTime() -
                new Date(b.scheduled_at || b.created_at || 0).getTime(),
            )[0]?.id
          : row.appointment.id;

      return (
        <AppointmentListRowCard
          row={row}
          index={index}
          onPress={() => {
            if (aptId && user?.id) {
              void openIncomingOffer(aptId, 'nurse', user.id);
            }
          }}
          showOfferActions
          onAccept={() => requestAccept(row)}
          onRefuse={() => void handleRefuse(row)}
        />
      );
    },
    [handleRefuse, openIncomingOffer, requestAccept, user?.id],
  );

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <PlanLimitsBanner />
      </View>
    ),
    [],
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.skeleton}>
          <SkeletonGroup count={4} height={120} gap={12} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={displayRows}
        renderItem={renderItem}
        keyExtractor={(item) => (item.kind === 'batch' ? item.key : item.appointment.id)}
        ListHeaderComponent={ListHeader}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="Aucune demande en attente"
            description="Les nouvelles propositions de soins apparaîtront ici. La liste se met à jour automatiquement."
            Icon={Inbox}
          />
        }
      />

      <NurseOfferConfirmSheet
        visible={confirmOpen}
        loading={actionLoading}
        batchCount={pendingConfirm?.count ?? 1}
        onClose={() => {
          if (actionLoading) return;
          setConfirmOpen(false);
          setPendingConfirm(null);
        }}
        onConfirm={() => {
          if (pendingConfirm) void runAccept(pendingConfirm.row);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  skeleton: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  listHeader: { marginBottom: spacing[2] },
});
