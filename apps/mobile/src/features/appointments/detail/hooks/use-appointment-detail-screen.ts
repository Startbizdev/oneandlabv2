import { createElement, useCallback, useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useNavigation } from 'expo-router';
import type { Appointment } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { useAppointmentDetail } from '../../hooks/use-appointment-detail';
import { useAppointmentBatch } from './use-appointment-batch';
import { fetchMedicalDocuments } from '../api/appointment-detail.service';
import { useShareForNurse } from './use-appointment-detail-extras';
import { getAppointmentDetailRoleConfig } from '../utils/appointment-detail-role-config';
import { filterListDocuments } from '../utils/document-labels';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { RdvDetailNavTitle } from '../components/layout/RdvDetailNavTitle';
import { appointmentPatientHeaderTitle } from '../utils/patient-appointment-display';
import { effectiveAppointmentStatus } from '@/utils/effective-appointment-status';

const POLL_ACTIVE_MS = 6000;
const POLL_QUIET_MS = 30_000;

function patientCanCancelStatus(status: unknown): boolean {
  return ['pending', 'confirmed', 'planned'].includes(String(status ?? ''));
}

export function useAppointmentDetailScreen(
  role: string,
  id: string | undefined,
  viewerId?: string | null,
) {
  const navigation = useNavigation();
  const config = getAppointmentDetailRoleConfig(role);

  const detailQ = useAppointmentDetail(id);
  const apt = detailQ.data;
  const { batchSorted, isMultiBatch, batchIds, siblingsLoading, refetchSiblings } =
    useAppointmentBatch(apt);

  /** RDV ouvert (URL) — ne pas remplacer par le 1er du lot trié chronologiquement. */
  const primary =
    apt ?? batchSorted.find((a) => String(a.id) === String(id)) ?? batchSorted[0];
  const shareQ = useShareForNurse(id, config.showShareBlock);

  const docQueries = useQueries({
    queries: batchIds.map((bid) => ({
      queryKey: queryKeys.documents.medical(bid),
      queryFn: async () => (await fetchMedicalDocuments(bid)).data ?? [],
      enabled: Boolean(bid),
    })),
  });

  const allDocuments = useMemo(() => {
    const merged = docQueries.flatMap((q) => q.data ?? []);
    const seen = new Set<string>();
    return merged.filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
  }, [docQueries]);

  const docsLoading = docQueries.some((q) => q.isLoading);
  const canceled = primary ? isAppointmentCanceled(primary.status) : false;

  const cancellableForPatient = useMemo(
    () =>
      role === 'patient'
        ? batchSorted.filter((a) => patientCanCancelStatus(a.status))
        : [],
    [role, batchSorted],
  );

  const listDocuments = useMemo(
    () =>
      filterListDocuments(allDocuments, {
        omitCarePhotos: config.showCarePhotosBlock,
      }),
    [allDocuments, config.showCarePhotosBlock],
  );

  const refreshAll = useCallback(() => {
    void detailQ.refetch();
    void refetchSiblings();
    docQueries.forEach((q) => void q.refetch());
    if (config.showShareBlock) void shareQ.refetch();
  }, [detailQ, refetchSiblings, docQueries, config.showShareBlock, shareQ]);

  const isRefreshing =
    detailQ.isRefetching || siblingsLoading || docQueries.some((q) => q.isRefetching);

  useEffect(() => {
    const title = primary
      ? appointmentPatientHeaderTitle(primary, batchSorted.length)
      : 'Rendez-vous';
    const displayStatus = primary
      ? effectiveAppointmentStatus(primary, { role, viewerId })
      : undefined;
    const status = displayStatus ?? primary?.status;
    navigation.setOptions({
      headerTitle: primary
        ? () => createElement(RdvDetailNavTitle, { title, status })
        : title,
      headerRight: undefined,
      headerTitleAlign: 'left',
    });
  }, [navigation, primary, batchSorted.length, primary?.status, role, viewerId]);

  useEffect(() => {
    if (!config.enablePolling || !id) return;
    const terminal = new Set(['canceled', 'cancelled', 'completed', 'refused', 'expired']);
    const anyActive = batchSorted.some((a) => !terminal.has(String(a.status ?? '')));
    const ms = anyActive ? POLL_ACTIVE_MS : POLL_QUIET_MS;
    const t = setInterval(() => refreshAll(), ms);
    return () => clearInterval(t);
  }, [config.enablePolling, id, batchSorted, refreshAll]);

  return {
    role,
    id,
    config,
    apt,
    primary: primary as Appointment | undefined,
    batchSorted,
    isMultiBatch,
    canceled,
    cancellableForPatient,
    allDocuments,
    listDocuments,
    docsLoading,
    shareQ,
    isLoading: detailQ.isPending && detailQ.data === undefined,
    siblingsLoading,
    isRefreshing,
    refreshAll,
  };
}
