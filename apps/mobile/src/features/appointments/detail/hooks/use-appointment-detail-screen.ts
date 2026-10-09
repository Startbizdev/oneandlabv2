import { createElement, useCallback, useEffect, useMemo, useRef } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import type { Appointment } from '@oneandlab/shared-types';
import { appointmentDossierPatientId, canCancelAppointment } from '@oneandlab/shared-utils';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/store/auth-store';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';
import { fetchPatientProfile } from '@/features/patients/api/patient-profile.service';
import { useAppointmentDetail } from '../../hooks/use-appointment-detail';
import {
  APPOINTMENT_ALREADY_ACCEPTED,
  appointmentDetailBlockReason,
  resolveAppointmentDetail,
} from '../../hooks/appointment-detail-result';
import { useAppointmentBatch } from './use-appointment-batch';
import { medicalDocumentsQueryOptions } from './use-appointment-detail-extras';
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

export function useAppointmentDetailScreen(
  role: string,
  id: string | undefined,
  viewerId?: string | null,
) {
  const user = useAuthStore((s) => s.user);
  const config = getAppointmentDetailRoleConfig(role);
  const focused = useIsFocused();
  const appActive = useAppActive();

  const detailQ = useAppointmentDetail(id);
  const detailBlock = appointmentDetailBlockReason(detailQ.data);
  const apt = resolveAppointmentDetail(detailQ.data);
  const { batchSorted, isMultiBatch, batchIds, siblingsLoading, refetchSiblings } =
    useAppointmentBatch(apt);

  /** RDV ouvert (URL) — ne pas remplacer par le 1er du lot trié chronologiquement. */
  const primary =
    apt ?? batchSorted.find((a) => String(a.id) === String(id)) ?? batchSorted[0];
  /** Dossier du patient concerné : le proche pour un RDV pris pour lui, sinon le titulaire. */
  const patientId = appointmentDossierPatientId(primary) ?? undefined;

  const needsPatientAvatarEnrichment = useMemo(() => {
    if (!primary || !patientId) return false;
    if (!STAFF_PROFILE_MERGE_ROLES.has(role)) return false;
    const ext = primary as { beneficiary_profile_image_url?: string | null };
    return !ext.beneficiary_profile_image_url;
  }, [primary, patientId, role]);

  /** Fiche du patient concerné : avatar + lien « Dossier de … ». */
  const patientProfileQ = useQuery({
    queryKey: queryKeys.patients.detail(patientId ?? ''),
    queryFn: async () => {
      if (!patientId) return null;
      const res = await fetchPatientProfile(patientId);
      if (!res.success) return null;
      return res.data ?? null;
    },
    enabled: Boolean(patientId) && STAFF_PROFILE_MERGE_ROLES.has(role),
    staleTime: 60_000,
  });

  const primaryForDisplay = useMemo((): Appointment | undefined => {
    if (!primary) return undefined;
    const ext = primary as Appointment & {
      beneficiary_profile_image_url?: string | null;
      beneficiary_gender?: string | null;
    };
    if (ext.beneficiary_profile_image_url) return primary;
    const profile = patientProfileQ.data;
    if (!profile?.profile_image_url) return primary;
    return {
      ...primary,
      beneficiary_profile_image_url: profile.profile_image_url,
      beneficiary_gender: ext.beneficiary_gender ?? profile.gender ?? null,
    } as Appointment;
  }, [primary, patientProfileQ.data]);

  const docQueries = useQueries({
    queries: batchIds.map(medicalDocumentsQueryOptions),
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
  /** Échec sans cache : la liste serait incomplète, on l'annonce plutôt que d'afficher « aucun document ». */
  const docsError = docQueries.find((q) => q.isError && q.data === undefined)?.error ?? null;
  const retryDocs = useCallback(() => {
    docQueries.forEach((q) => {
      if (q.isError) void q.refetch();
    });
  }, [docQueries]);
  const canceled = primary ? isAppointmentCanceled(primary.status) : false;

  const cancellableForPatient = useMemo(
    () =>
      role === 'patient'
        ? batchSorted.filter(
            (a) =>
              patientCanCancelStatus(a.status)
              && canCancelAppointment(a, { role, id: viewerId ?? user?.id }),
          )
        : [],
    [role, batchSorted, viewerId, user?.id],
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
    if (needsPatientAvatarEnrichment) void patientProfileQ.refetch();
  }, [
    detailQ,
    refetchSiblings,
    docQueries,
    needsPatientAvatarEnrichment,
    patientProfileQ,
  ]);

  const detailFocusSkipRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (!id) return undefined;
      if (detailFocusSkipRef.current) {
        detailFocusSkipRef.current = false;
        return undefined;
      }
      refreshAll();
      return undefined;
    }, [id, refreshAll]),
  );

  const isRefreshing =
    detailQ.isRefetching ||
    siblingsLoading ||
    docQueries.some((q) => q.isRefetching);

  const headerTitleNode = useMemo(() => {
    if (!primary) return 'Rendez-vous';
    const title = appointmentPatientHeaderTitle(primary, batchSorted.length);
    const displayStatus = effectiveAppointmentStatus(primary, { role, viewerId });
    const status = displayStatus ?? primary.status;
    return createElement(RdvDetailNavTitle, { title, status });
  }, [primary, batchSorted.length, role, viewerId]);

  const pollEvery = useMemo(() => {
    if (!config.enablePolling || !id) return false;
    const terminal = new Set(['canceled', 'cancelled', 'completed', 'refused', 'expired']);
    const anyActive = batchSorted.some((a) => !terminal.has(String(a.status ?? '')));
    return focusedRefetchInterval(anyActive ? POLL_ACTIVE_MS : POLL_QUIET_MS, focused, appActive);
  }, [config.enablePolling, id, batchSorted, focused, appActive]);

  useEffect(() => {
    if (pollEvery === false) return;
    const t = setInterval(() => refreshAll(), pollEvery);
    return () => clearInterval(t);
  }, [pollEvery, refreshAll]);

  return {
    role,
    id,
    config,
    apt,
    /** Dossier du patient concerné (proche ou titulaire), `undefined` sans dossier. */
    dossierPatientId: patientId,
    /** Fiche de ce dossier (staff uniquement, null sinon). */
    dossierProfile: patientProfileQ.data ?? null,
    primary: primaryForDisplay,
    batchSorted,
    isMultiBatch,
    canceled,
    cancellableForPatient,
    allDocuments,
    listDocuments,
    docsLoading,
    docsError,
    retryDocs,
    isLoading:
      detailQ.isPending && detailQ.data === undefined && !detailQ.isError && !detailBlock,
    detailBlock,
    /** @deprecated Utiliser detailBlock === APPOINTMENT_ALREADY_ACCEPTED */
    alreadyAccepted: detailBlock === APPOINTMENT_ALREADY_ACCEPTED,
    /** Premier chargement en échec (un échec de rafraîchissement garde la fiche en cache). */
    detailError: detailBlock || apt ? null : detailQ.error,
    retryDetail: detailQ.refetch,
    detailFetching: detailQ.isFetching,
    siblingsLoading,
    isRefreshing,
    refreshAll,
    headerTitleNode,
  };
}
