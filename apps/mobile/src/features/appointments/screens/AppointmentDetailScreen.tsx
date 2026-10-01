import { useEffect, useMemo, useRef, useState } from 'react';
import { View, type ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useScrollToTopOnPop } from '@/lib/hooks/use-scroll-to-top-on-pop';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isPendingIncomingOffer } from '@oneandlab/shared-utils';
import { useAuthStore } from '@/store/auth-store';
import { useIsFocused } from '@react-navigation/native';
import { useAppActive } from '@/lib/hooks/use-app-active';
import { focusedRefetchInterval } from '@/lib/focused-refetch-interval';
import { prescriptionGenerationEnabled } from '@/features/prescriptions/utils/prescription-access';
import { SkeletonStaffAppointmentDetail } from '@/components/ui/skeletons';
import { AppointmentDetailBlockedEmptyState } from '../detail/components/AppointmentDetailBlockedEmptyState';
import { AppointmentDetailLoadError } from '../detail/components/AppointmentDetailLoadError';
import { useAppointmentDetailScreen } from '../detail/hooks/use-appointment-detail-screen';
import { RdvDocumentsPremiumPanel } from '../detail/components/RdvDocumentsPremiumPanel';
import { DetailSidebarActions } from '../detail/components/DetailSidebarActions';
import { fetchCarePhotos } from '../detail/api/appointment-detail.service';
import { useCarePhotoUnread } from '../detail/hooks/use-care-photo-unread';
import { appointmentDetailTabLabels } from '../detail/utils/care-photo-copy';
import { CancelAppointmentSheet } from '../detail/components/blocks/CancelAppointmentSheet';
import {
  appointmentPrescriptionHref,
  appointmentPrescriptionStatus,
  appointmentPrescriptionTitle,
} from '../detail/utils/appointment-prescription-navigation';
import { carePhotoDiscussionHint } from '../detail/utils/care-photo-copy';
import { ProPatientReviewSection } from '../detail/components/ProPatientReviewSection';
import { StaffPatientKvSection } from '../detail/components/StaffPatientKvSection';
import { PatientAssigneeRows } from '../detail/components/patient/PatientAssigneeRows';
import { RdvAppointmentInfoSection } from '../detail/components/layout/RdvAppointmentInfoSection';
import { DetailSegmentBar } from '../detail/components/layout/DetailSegmentBar';
import { isCarePhotoGalleryContext } from '../detail/utils/care-photo-rules';
import {
  parseCarePhotoDeepLinkParams,
} from '../detail/utils/care-photo-deep-link';
import { appointmentEditHref } from '@/navigation/role-hrefs';
import { roleRoutePrefix } from '@/navigation/role-route-prefix';
import { carePhotoDiscussionHref, isCarePhotoExchangeRole } from '../detail/utils/care-photo-navigation';
import { appointmentConversationHref } from '../detail/utils/conversation-navigation';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { getAppointmentSidebarTerminalEmpty } from '@/utils/appointment-sidebar-terminal';
import { filterListDocuments } from '../detail/utils/document-labels';
import { staffPatientProfileHref } from '@/features/patients/utils/staff-hub-navigation';
import { beneficiaryDisplayName } from '@/utils/beneficiary-display-name';
import { SceneScrollView } from '@/components/navigation/SceneScrollView';
import { SettingsSection } from '@/components/ui/SettingsSection';
import type { SettingsRowProps } from '@/components/ui/SettingsRow';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { spacing, useStyles } from '@/theme';
import { FilePenLine, HeartPulse, MessageCircle } from 'lucide-react-native';

interface Props {
  role: string;
}

type SegmentId = 'infos' | 'documents';

export function AppointmentDetailScreen({ role }: Props) {
  const styles = useStyles(buildStyles);

  const { id: idParam, careGallery, carePhoto, segment: segmentParam } = useLocalSearchParams<{
    id?: string;
    careGallery?: string;
    carePhoto?: string;
    segment?: string;
  }>();
  const id = idParam ?? '';
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const focused = useIsFocused();
  const appActive = useAppActive();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [segment, setSegment] = useState<SegmentId>('infos');

  const s = useAppointmentDetailScreen(role, id, user?.id);
  const openIncomingOffer = useOfferQueueStore((st) => st.openIncomingOffer);

  const { config, primary } = s;

  /** Infirmier : pas de fiche détail tant que l’offre n’est pas acceptée (modal d’abord). */
  useEffect(() => {
    if (!id || !user?.id || !primary || role !== 'nurse') return;
    if (s.detailFetching) return;
    if (!isPendingIncomingOffer(primary, user.id)) return;

    void (async () => {
      await openIncomingOffer(id, role, user.id);
      router.replace('/(nurse)/(tabs)/demandes');
    })();
  }, [id, openIncomingOffer, primary, role, router, s.detailFetching, user?.id]);
  const showCareFollowUp = Boolean(
    config.showCarePhotosBlock && primary && isCarePhotoExchangeRole(role),
  );
  const hasCareGallery = Boolean(
    showCareFollowUp && primary && isCarePhotoGalleryContext(primary),
  );

  const carePhotosQ = useQuery({
    queryKey: ['appointments', 'care-photos', id] as const,
    queryFn: async () => {
      const res = await fetchCarePhotos(id);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    enabled: Boolean(hasCareGallery && id),
    refetchInterval: focusedRefetchInterval(8000, focused, appActive),
    refetchIntervalInBackground: false,
  });

  const carePhotos = carePhotosQ.data?.photos ?? [];
  const { unread: careExchangeUnread } = useCarePhotoUnread(
    id,
    carePhotos,
    user?.id,
    carePhotosQ.data?.thread,
  );

  useEffect(() => {
    const parsed = parseCarePhotoDeepLinkParams({ careGallery, carePhoto });
    if (!parsed || !id) return;
    router.setParams({ careGallery: undefined, carePhoto: undefined });
    if (!isCarePhotoExchangeRole(role)) return;
    router.push(carePhotoDiscussionHref(role, id, parsed.photoId));
  }, [careGallery, carePhoto, id, role, router]);

  useEffect(() => {
    const raw = Array.isArray(segmentParam) ? segmentParam[0] : segmentParam;
    if ((raw === 'photos' || raw === 'exchange') && id && hasCareGallery && isCarePhotoExchangeRole(role)) {
      router.setParams({ segment: undefined });
      router.push(carePhotoDiscussionHref(role, id));
      return;
    }
    const normalized = raw === 'documents' ? 'documents' : null;
    if (!normalized) return;
    setSegment(normalized);
    router.setParams({ segment: undefined });
  }, [segmentParam, id, router, role, hasCareGallery]);
  const terminal = primary
    ? getAppointmentSidebarTerminalEmpty(primary.status)
    : null;
  const showActionsBlock = config.showActionsBlock && !terminal;

  const docList = useMemo(
    () =>
      filterListDocuments(
        s.allDocuments.filter((d) =>
          role === 'patient' ? d.document_type !== 'cancellation_photo' : true,
        ),
        { omitCarePhotos: hasCareGallery },
      ),
    [s.allDocuments, role, hasCareGallery],
  );

  const segments = useMemo(() => {
    const items: { id: SegmentId; label: string; badge?: number }[] = [
      { id: 'infos', label: appointmentDetailTabLabels.infos },
    ];
    if (config.showDocumentsBlock) {
      items.push({
        id: 'documents',
        label: appointmentDetailTabLabels.documents,
        badge: docList.length || undefined,
      });
    }
    return items;
  }, [config.showDocumentsBlock, docList.length]);

  const activeSegment = segments.some((x) => x.id === segment) ? segment : 'infos';

  const isIncomingOffer =
    role === 'nurse' &&
    !!primary &&
    !!user?.id &&
    isPendingIncomingOffer(primary, user.id);

  const pullRefresh = useManualRefresh(async () => {
    s.refreshAll();
  });
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTopOnPop(scrollRef);

  if (s.detailBlock) {
    return (
      <StackChromeScreen>
        <AppointmentDetailBlockedEmptyState
          onBack={() => router.back()}
          block={s.detailBlock}
        />
      </StackChromeScreen>
    );
  }

  if (s.detailError) {
    return (
      <StackChromeScreen>
        <AppointmentDetailLoadError
          error={s.detailError}
          onRetry={() => void s.retryDetail()}
          onBack={() => router.back()}
        />
      </StackChromeScreen>
    );
  }

  if (s.isLoading || !s.apt || !primary) {
    return (
      <StackChromeScreen>
        <SkeletonStaffAppointmentDetail
          showPhotosTab={config.showCarePhotosBlock}
          showAssignees
          showActions={config.showActionsBlock}
        />
      </StackChromeScreen>
    );
  }

  if (isIncomingOffer) {
    return (
      <StackChromeScreen>
        <SkeletonStaffAppointmentDetail showAssignees={false} showActions={false} />
      </StackChromeScreen>
    );
  }

  const { batchSorted, isMultiBatch, canceled } = s;
  const editHref = config.canReschedule ? appointmentEditHref(roleRoutePrefix(role), id) : null;
  const patientProfileHref = staffPatientProfileHref(role, primary?.patient_id);
  const openPatientProfile = patientProfileHref
    ? () => router.push(patientProfileHref)
    : undefined;
  // Bénéficiaire ≠ titulaire du compte (proche ou nom saisi dans le formulaire) :
  // le bouton ouvre la fiche du titulaire, on l’annonce explicitement.
  const accountHolderName = [
    s.patientAccountProfile?.first_name,
    s.patientAccountProfile?.last_name,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const normalizeName = (v: string) => v.trim().replace(/\s+/g, ' ').toLowerCase();
  const beneficiaryName = beneficiaryDisplayName(primary);
  const beneficiaryDiffersFromHolder = Boolean(
    accountHolderName &&
      beneficiaryName &&
      beneficiaryName !== '—' &&
      normalizeName(accountHolderName) !== normalizeName(beneficiaryName),
  );
  const viewPatientProfileLabel = beneficiaryDiffersFromHolder
    ? `Profil du titulaire · ${accountHolderName}`
    : undefined;
  const showPrescription =
    (role === 'pro' || role === 'nurse') &&
    config.showPrescriptionBlock &&
    prescriptionGenerationEnabled(user) &&
    !isAppointmentCanceled(primary.status);

  const followUpRows: SettingsRowProps[] = [
    {
      icon: MessageCircle,
      label: 'Messages',
      description: 'Avec le patient',
      onPress: () => router.push(appointmentConversationHref(role, id)),
    },
  ];
  if (hasCareGallery && isCarePhotoExchangeRole(role)) {
    followUpRows.push({
      icon: HeartPulse,
      label: 'Suivi des soins',
      description: carePhotoDiscussionHint(role),
      badge: careExchangeUnread || undefined,
      onPress: () => router.push(carePhotoDiscussionHref(role, id)),
    });
  }
  if (showPrescription) {
    followUpRows.push({
      icon: FilePenLine,
      label: appointmentPrescriptionTitle(role),
      description: appointmentPrescriptionStatus(s.allDocuments),
      onPress: () => router.push(appointmentPrescriptionHref(role, id)),
    });
  }

  return (
    <>
      <StackChromeScreen title={s.headerTitleNode}>
        <SceneScrollView
          scrollRef={scrollRef}
          contentContainerStyle={[styles.scroll, styles.content]}
          refreshing={pullRefresh.refreshing}
          onRefresh={pullRefresh.onRefresh}
        >
          <DetailSegmentBar
            segments={segments}
            active={activeSegment}
            onChange={(sid) => setSegment(sid as SegmentId)}
          />

          {activeSegment === 'infos' ? (
            <View style={styles.tabBody}>
              <RdvAppointmentInfoSection
                apt={primary}
                viewer={user}
                batch={isMultiBatch ? batchSorted : undefined}
                batchLoading={s.siblingsLoading}
                showMapActions
                onViewPatientProfile={openPatientProfile}
                viewPatientProfileLabel={viewPatientProfileLabel}
              />
              <StaffPatientKvSection apt={primary} />
              <PatientAssigneeRows apt={primary} />
              <SettingsSection title="Suivi" items={followUpRows} />
              {config.showProReviewBlock && primary.status === 'completed' ? (
                <ProPatientReviewSection apt={primary} />
              ) : null}
              {showActionsBlock ? (
                <DetailSidebarActions
                  role={role}
                  viewerId={user?.id}
                  apt={primary}
                  onShareDone={s.refreshAll}
                  onReschedule={() => {
                    if (editHref) router.push(editHref);
                  }}
                  onCancel={() => setCancelOpen(true)}
                />
              ) : null}
            </View>
          ) : null}

          {activeSegment === 'documents' && config.showDocumentsBlock ? (
            <RdvDocumentsPremiumPanel
              appointmentId={id}
              apt={primary}
              role={role}
              docs={s.allDocuments}
              loading={s.docsLoading}
              error={s.docsError}
              onRetry={s.retryDocs}
              omitCarePhotos={hasCareGallery}
            />
          ) : null}

        </SceneScrollView>
      </StackChromeScreen>

      <CancelAppointmentSheet
        visible={cancelOpen && !canceled}
        target={primary}
        onDone={() => router.back()}
        onClose={() => setCancelOpen(false)}
      />
    </>
  );
}

function buildStyles() {
  return {
  scroll: {
    minWidth: 0,
    flexGrow: 1,
    alignSelf: 'stretch' as const,
    paddingBottom: spacing[10],
  },
  content: {
    alignSelf: 'stretch' as const,
    width: '100%' as const,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[3],
  },
  tabBody: { gap: spacing[5] },
};
}
