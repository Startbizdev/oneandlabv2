import { createElement, useCallback, useEffect, useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useNavigation, useRouter } from 'expo-router';
import type { Appointment } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { HeaderBackButton } from '@/navigation/HeaderBackButton';
import { useAuthStore } from '@/store/auth-store';
import { fetchProfileDocuments } from '@/features/patients/api/patient-profile.service';
import { mergeProfileDocumentsIntoAppointmentDocs } from '@/features/documents/utils/merge-profile-documents';
import { useAppointmentDetail } from '../../hooks/use-appointment-detail';
import {
  APPOINTMENT_ALREADY_ACCEPTED,
  appointmentDetailBlockReason,
  resolveAppointmentDetail,
} from '../../hooks/appointment-detail-result';
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
  const s = String(status ?? '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  return ['pending', 'confirmed', 'planned', 'in_progress', 'inprogress'].includes(s);
}

const STAFF_PROFILE_MERGE_ROLES = new Set(['pro', 'nurse', 'preleveur']);

function shouldMergeProfileDocuments(role: string, relativeId?: string): boolean {
  if (role === 'patient') return true;
  if (relativeId) return false;
  return STAFF_PROFILE_MERGE_ROLES.has(role);
}

export function useAppointmentDetailScreen(
  role: string,
  id: string | undefined,
  viewerId?: string | null,
) {
  const navigation = useNavigation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const config = getAppointmentDetailRoleConfig(role);

  const detailQ = useAppointmentDetail(id);
  const detailBlock = appointmentDetailBlockReason(detailQ.data);
  const apt = resolveAppointmentDetail(detailQ.data);
  const { batchSorted, isMultiBatch, batchIds, siblingsLoading, refetchSiblings } =
    useAppointmentBatch(apt);

  /** RDV ouvert (URL) — ne pas remplacer par le 1er du lot trié chronologiquement. */
  const primary =
    apt ?? batchSorted.find((a) => String(a.id) === String(id)) ?? batchSorted[0];
  const relativeId = primary?.relative_id?.trim() || undefined;
  const patientId = primary?.patient_id?.trim() || undefined;
  const mergeProfileDocs = shouldMergeProfileDocuments(role, relativeId);

  const profileDocsQ = useQuery({
    queryKey: relativeId
      ? queryKeys.documents.relative(relativeId)
      : queryKeys.documents.patient(role === 'patient' ? (user?.id ?? '') : (patientId ?? '')),
    queryFn: async () => {
      const params =
        role === 'patient'
          ? relativeId
            ? { relativeId }
            : {}
          : { userId: patientId };
      const res = await fetchProfileDocuments(params);
      if (!res.success) throw new Error(res.error ?? 'Erreur chargement documents profil');
      return res.data ?? [];
    },
    enabled:
      Boolean(primary) &&
      mergeProfileDocs &&
      (role === 'patient' ? Boolean(user?.id) : Boolean(patientId)),
    staleTime: 30_000,
  });

  /** Pas de prefetch : GET share-for-nurse ne doit pas être appelé à l’ouverture (effet de bord historique côté API). */
  const shareQ = useShareForNurse(id, false);

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
    const aptDocs = merged.filter((d) => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
    if (!mergeProfileDocs) return aptDocs;
    return mergeProfileDocumentsIntoAppointmentDocs(aptDocs, profileDocsQ.data ?? []);
  }, [docQueries, mergeProfileDocs, profileDocsQ.data]);

  const docsLoading =
    docQueries.some((q) => q.isLoading) ||
    (mergeProfileDocs && profileDocsQ.isLoading && profileDocsQ.data === undefined);
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
    if (mergeProfileDocs) void profileDocsQ.refetch();
  }, [detailQ, refetchSiblings, docQueries, profileDocsQ, mergeProfileDocs]);

  const isRefreshing =
    detailQ.isRefetching ||
    siblingsLoading ||
    docQueries.some((q) => q.isRefetching) ||
    (mergeProfileDocs && profileDocsQ.isRefetching);

  const handleHeaderBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    if (role === 'patient') {
      router.replace('/(patient)/(tabs)/appointments' as never);
    }
  }, [navigation, role, router]);

  useEffect(() => {
    const title = primary
      ? appointmentPatientHeaderTitle(primary, batchSorted.length)
      : 'Rendez-vous';
    const displayStatus = primary
      ? effectiveAppointmentStatus(primary, { role, viewerId })
      : undefined;
    const status = displayStatus ?? primary?.status;
    const showBack = navigation.canGoBack() || role === 'patient';
    navigation.setOptions({
      headerTitle: primary
        ? () => createElement(RdvDetailNavTitle, { title, status })
        : title,
      headerLeft: showBack
        ? () => createElement(HeaderBackButton, { onPress: handleHeaderBack })
        : undefined,
      headerRight: undefined,
      headerTitleAlign: 'left',
    });
  }, [
    navigation,
    primary,
    batchSorted.length,
    primary?.status,
    role,
    viewerId,
    handleHeaderBack,
  ]);

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
    isLoading:
      detailQ.isPending && detailQ.data === undefined && !detailQ.isError && !detailBlock,
    detailBlock,
    /** @deprecated Utiliser detailBlock === APPOINTMENT_ALREADY_ACCEPTED */
    alreadyAccepted: detailBlock === APPOINTMENT_ALREADY_ACCEPTED,
    detailError: detailBlock ? null : detailQ.error,
    detailFetching: detailQ.isFetching,
    siblingsLoading,
    isRefreshing,
    refreshAll,
  };
}
