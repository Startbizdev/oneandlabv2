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
  careExchangeInformativeHint,
  careExchangeTabLabel,
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
import { colors, spacing } from '@/theme';

interface Props {
  role: string;
}

type SegmentId = 'infos' | 'documents' | 'photos';

export function AppointmentDetailScreen({ role }: Props) {
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
  const showCarePhotos = Boolean(
    config.showCarePhotosBlock && primary && isCarePhotoGalleryContext(primary),
  );

  const carePhotosQ = useQuery({
    queryKey: ['appointments', 'care-photos', id] as const,
    queryFn: async () => {
      const res = await fetchCarePhotos(id!);
      if (!res.success || !res.data) throw new Error(res.error ?? 'Chargement impossible');
      return res.data;
    },
    enabled: Boolean(showCarePhotos && id),
    refetchInterval: 8000,
  });

  const carePhotos = carePhotosQ.data?.photos ?? [];
  const { unread: careExchangeUnread } = useCarePhotoUnread(id, carePhotos, user?.id);

  const careExchangeHint = useMemo(() => {
    if (!showCarePhotos || (role !== 'pro' && role !== 'nurse')) return null;
    return careExchangeInformativeHint(role, careExchangeUnread);
  }, [showCarePhotos, role, careExchangeUnread]);

  useEffect(() => {
    const parsed = parseCarePhotoDeepLinkParams({ careGallery, carePhoto });
    if (!parsed || !id) return;
    router.setParams({ careGallery: undefined, carePhoto: undefined } as never);
    if (parsed.photoId) {
      router.push(carePhotoDiscussionHref(role, id, parsed.photoId) as never);
      return;
    }
    setSegment('photos');
  }, [careGallery, carePhoto, id, role, router]);

  useEffect(() => {
    const raw = Array.isArray(segmentParam) ? segmentParam[0] : segmentParam;
    if (raw !== 'documents' && raw !== 'photos') return;
    setSegment(raw);
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
        { omitCarePhotos: showCarePhotos },
      ),
    [s.allDocuments, role, showCarePhotos],
  );

  const segments = useMemo(() => {
    const items: { id: SegmentId; label: string; badge?: number }[] = [
      { id: 'infos', label: 'Informations' },
    ];
    if (config.showDocumentsBlock) {
      items.push({
        id: 'documents',
        label: 'Documents',
        badge: docList.length || undefined,
      });
    }
    if (showCarePhotos) {
      items.push({
        id: 'photos',
        label: careExchangeTabLabel(),
        badge: careExchangeUnread > 0 ? careExchangeUnread : undefined,
      });
    }
    return items;
  }, [config.showDocumentsBlock, docList.length, showCarePhotos, careExchangeUnread]);

  const activeSegment = segments.some((x) => x.id === segment) ? segment : 'infos';

  const isIncomingOffer =
    role === 'nurse' &&
    !!primary &&
    !!user?.id &&
    isPendingIncomingOffer(primary, user.id);

  const pullRefresh = useManualRefresh(async () => {
    s.refreshAll();
  });

  if (s.detailBlock) {
    return (
      <AppointmentDetailBlockedEmptyState
        onBack={() => router.back()}
        block={s.detailBlock}
      />
    );
  }

  if (s.detailError) {
    const blockedMessage =
      s.detailError instanceof Error
        ? s.detailError.message
        : 'Impossible d’ouvrir ce rendez-vous.';
    return (
      <View style={styles.blocked}>
        <AppointmentDetailBlockedEmptyState
          onBack={() => router.back()}
          description={blockedMessage}
        />
      </View>
    );
  }

  if (s.isLoading || !s.apt || !primary) {
    return (
      <SkeletonStaffAppointmentDetail
        showPhotosTab={config.showCarePhotosBlock}
        showAssignees
        showActions={config.showActionsBlock}
      />
    );
  }

  if (isIncomingOffer) {
    return <SkeletonStaffAppointmentDetail showAssignees={false} showActions={false} />;
  }

  const { batchSorted, isMultiBatch, canceled } = s;
  const editPath = config.canReschedule && id ? reschedulePathForRole(role, id) : null;
  const showPrescription =
    role === 'pro' && config.showPrescriptionBlock && !isAppointmentCanceled(primary.status);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={pullRefresh.refreshing}
            onRefresh={pullRefresh.onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
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
                  onPress={() => setSegment('photos')}
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
                />
              </View>
              <StaffPatientKvSection apt={primary} />
              <PatientAssigneeRows apt={primary} />
              {showPrescription ? (
                <PrescriptionSection
                  appointmentId={id!}
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
              omitCarePhotos={showCarePhotos}
              embedded
            />
          ) : null}

          {activeSegment === 'photos' && showCarePhotos ? (
            <DetailCarePhotosPanel
              apt={primary}
              userId={user?.id}
              viewerRole={role}
            />
          ) : null}
        </View>
      </ScrollView>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    backgroundColor: colors.background,
  },
  scroll: { paddingBottom: spacing[10] },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[3],
  },
  tabBody: { gap: spacing[3] },
  edgeBleed: {
    marginHorizontal: -spacing[4],
  },
  blocked: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
});
