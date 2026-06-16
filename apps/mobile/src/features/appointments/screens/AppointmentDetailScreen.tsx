import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isPendingIncomingOffer } from '@oneandlab/shared-utils';
import { useAuthStore } from '@/store/auth-store';
import { SkeletonStaffAppointmentDetail } from '@/components/ui/skeletons';
import { AppointmentDetailBlockedEmptyState } from '../detail/components/AppointmentDetailBlockedEmptyState';
import { useAppointmentDetailScreen } from '../detail/hooks/use-appointment-detail-screen';
import { RdvDocumentsPremiumPanel } from '../detail/components/RdvDocumentsPremiumPanel';
import { DetailSidebarActions } from '../detail/components/DetailSidebarActions';
import { CareExchangeHintBanner } from '../detail/components/blocks/CareExchangeHintBanner';
import { DetailCarePhotosPanel } from '../detail/components/blocks/DetailCarePhotosPanel';
import { fetchCarePhotos } from '../detail/api/appointment-detail.service';
import { useCarePhotoUnread } from '../detail/hooks/use-care-photo-unread';
import {
  appointmentDetailTabLabels,
  careExchangeInformativeHint,
} from '../detail/utils/care-photo-copy';
import { CancelAppointmentSheet } from '../detail/components/blocks/CancelAppointmentSheet';
import { OfferActions } from '../detail/components/OfferActions';
import { PrescriptionSection } from '../detail/components/PrescriptionSection';
import { ProPatientReviewSection } from '../detail/components/ProPatientReviewSection';
import { StaffPatientKvSection } from '../detail/components/StaffPatientKvSection';
import { PatientAssigneeRows } from '../detail/components/patient/PatientAssigneeRows';
import { RdvAppointmentInfoSection } from '../detail/components/layout/RdvAppointmentInfoSection';
import { DetailSegmentBar } from '../detail/components/layout/DetailSegmentBar';
import { DetailTerminalBanner } from '../detail/components/layout/DetailTerminalBanner';
import { isCarePhotoGalleryContext } from '../detail/utils/care-photo-rules';
import {
  parseCarePhotoDeepLinkParams,
} from '../detail/utils/care-photo-deep-link';
import { reschedulePathForRole } from '../detail/utils/appointment-detail-role-config';
import { carePhotoDiscussionHref } from '../detail/utils/care-photo-navigation';
import { useOfferQueueStore } from '@/features/appointments/store/offer-queue-store';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { getAppointmentSidebarTerminalEmpty } from '@/utils/appointment-sidebar-terminal';
import { filterListDocuments } from '../detail/utils/document-labels';
import { staffPatientProfilePath } from '@/features/patients/utils/staff-hub-navigation';
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';
import { spacing } from '@/theme';

interface Props {
  role: string;
}

type SegmentId = 'infos' | 'documents' | 'exchange';

function isStaffExchangeRole(role: string): boolean {
  return role === 'pro' || role === 'nurse';
}

export function AppointmentDetailScreen({ role }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_screens_AppointmentDetailScreen_tsx_AppointmentDetailScreen_styles');

  const { id, careGallery, carePhoto, segment: segmentParam } = useLocalSearchParams<{
    id: string;
    careGallery?: string;
    carePhoto?: string;
    segment?: string;
  }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
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
      router.replace('/(nurse)/(tabs)/demandes' as never);
    })();
  }, [id, openIncomingOffer, primary, role, router, s.detailFetching, user?.id]);
  const showExchangeTab = Boolean(
    config.showCarePhotosBlock && primary && isStaffExchangeRole(role),
  );
  const hasCareGallery = Boolean(
    showExchangeTab && primary && isCarePhotoGalleryContext(primary),
  );

  const carePhotosQ = useQuery({
    queryKey: ['appointments', 'care-photos', id] as const,
    queryFn: async () => {
      const res = await fetchCarePhotos(id!);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    enabled: Boolean(hasCareGallery && id),
    refetchInterval: 8000,
  });

  const carePhotos = carePhotosQ.data?.photos ?? [];
  const { unread: careExchangeUnread } = useCarePhotoUnread(
    id,
    carePhotos,
    user?.id,
    carePhotosQ.data?.thread,
  );

  const careExchangeHint = useMemo(() => {
    if (!showExchangeTab) return null;
    return careExchangeInformativeHint(role, careExchangeUnread);
  }, [showExchangeTab, role, careExchangeUnread]);

  useEffect(() => {
    const parsed = parseCarePhotoDeepLinkParams({ careGallery, carePhoto });
    if (!parsed || !id) return;
    router.setParams({ careGallery: undefined, carePhoto: undefined } as never);
    if (parsed.photoId) {
      router.push(carePhotoDiscussionHref(role, id, parsed.photoId) as never);
      return;
    }
    setSegment('exchange');
  }, [careGallery, carePhoto, id, role, router]);

  useEffect(() => {
    const raw = Array.isArray(segmentParam) ? segmentParam[0] : segmentParam;
    const normalized =
      raw === 'photos' || raw === 'exchange' ? 'exchange' : raw === 'documents' ? 'documents' : null;
    if (!normalized) return;
    setSegment(normalized);
    router.setParams({ segment: undefined } as never);
  }, [segmentParam, id, router]);
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
    if (showExchangeTab) {
      items.push({
        id: 'exchange',
        label: appointmentDetailTabLabels.exchange,
        badge: careExchangeUnread > 0 ? careExchangeUnread : undefined,
      });
    }
    return items;
  }, [config.showDocumentsBlock, docList.length, showExchangeTab, careExchangeUnread]);

  const activeSegment = segments.some((x) => x.id === segment) ? segment : 'infos';

  const isIncomingOffer =
    role === 'nurse' &&
    !!primary &&
    !!user?.id &&
    isPendingIncomingOffer(primary, user.id);

  const pullRefresh = useManualRefresh(async () => {
    s.refreshAll();
  });
  const scrollConfig = useStackScrollConfig([styles.scroll, styles.content]);

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
    const blockedMessage =
      s.detailError instanceof Error
        ? s.detailError.message
        : 'Impossible d’ouvrir ce rendez-vous.';
    return (
      <StackChromeScreen>
        <View style={styles.blocked}>
          <AppointmentDetailBlockedEmptyState
            onBack={() => router.back()}
            description={blockedMessage}
          />
        </View>
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
  const editPath = config.canReschedule && id ? reschedulePathForRole(role, id) : null;
  const patientProfilePath = staffPatientProfilePath(role, primary?.patient_id);
  const openPatientProfile = patientProfilePath
    ? () => router.push(patientProfilePath as never)
    : undefined;
  const showPrescription =
    role === 'pro' && config.showPrescriptionBlock && !isAppointmentCanceled(primary.status);

  return (
    <>
      <StackChromeScreen>
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl
              refreshing={pullRefresh.refreshing}
              onRefresh={pullRefresh.onRefresh}
              tintColor={c.primary}
              progressViewOffset={scrollConfig.refreshProgressOffset}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={scrollConfig.contentContainerStyle}
          {...spreadTabSceneScrollProps(scrollConfig)}
          keyboardShouldPersistTaps="handled"
        >
          {terminal ? <DetailTerminalBanner terminal={terminal} /> : null}

          {config.showOfferBlock && isPendingIncomingOffer(primary, user?.id) ? (
            <OfferActions appointmentId={id!} onDone={() => router.back()} />
          ) : null}

          <DetailSegmentBar
            segments={segments}
            active={activeSegment}
            onChange={(sid) => setSegment(sid as SegmentId)}
          />

          {activeSegment === 'infos' ? (
            <View style={styles.tabBody}>
              {careExchangeHint ? (
                <CareExchangeHintBanner
                  hint={careExchangeHint}
                  onPress={() => setSegment('exchange')}
                />
              ) : null}
              <View style={styles.edgeBleed}>
                <RdvAppointmentInfoSection
                  apt={primary}
                  viewer={user}
                  edgeToEdge
                  batch={isMultiBatch ? batchSorted : undefined}
                  batchLoading={s.siblingsLoading}
                  showMapActions={role !== 'patient'}
                  onViewPatientProfile={openPatientProfile}
                />
              </View>
              <StaffPatientKvSection apt={primary} />
              <PatientAssigneeRows apt={primary} />
              {showPrescription ? (
                <PrescriptionSection
                  appointmentId={id!}
                  patientId={primary.patient_id ?? ''}
                  role={role}
                  documents={s.allDocuments}
                  onDocumentsChanged={s.refreshAll}
                />
              ) : null}
              {config.showProReviewBlock && primary.status === 'completed' ? (
                <ProPatientReviewSection apt={primary} />
              ) : null}
              {showActionsBlock ? (
                <View style={styles.edgeBleed}>
                  <DetailSidebarActions
                    role={role}
                    viewerId={user?.id}
                    apt={primary}
                    edgeToEdge
                    shareData={s.shareQ.data ?? undefined}
                    shareLoading={s.shareQ.isLoading}
                    onShareDone={s.refreshAll}
                    onReschedule={() => {
                      if (editPath) router.push(editPath as never);
                    }}
                    onCancel={() => setCancelOpen(true)}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {activeSegment === 'documents' && config.showDocumentsBlock ? (
            <RdvDocumentsPremiumPanel
              appointmentId={id!}
              apt={primary}
              role={role}
              docs={s.allDocuments}
              loading={s.docsLoading}
              omitCarePhotos={hasCareGallery}
            />
          ) : null}

          {activeSegment === 'exchange' && showExchangeTab ? (
            <DetailCarePhotosPanel
              apt={primary}
              userId={user?.id}
              viewerRole={role}
            />
          ) : null}
        </ScrollView>
      </StackChromeScreen>

      <CancelAppointmentSheet
        visible={cancelOpen && !canceled}
        role={role}
        targets={[primary]}
        onDone={() => router.back()}
        onClose={() => setCancelOpen(false)}
      />
    </>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
  loading: {
    minWidth: 0,
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    backgroundColor: c.background,
  },
  scroll: {
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
  tabBody: { gap: spacing[3] },
  edgeBleed: {
    marginHorizontal: -spacing[4],
  },
  blocked: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
    justifyContent: 'center' as const,
  },
};
}
