import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isNursingAppointment, isPendingIncomingOffer } from '@oneandlab/shared-utils';
import { useAuthStore } from '@/store/auth-store';
import { SkeletonGroup } from '@/components/ui/Skeleton';
import { useAppointmentDetailScreen } from '../detail/hooks/use-appointment-detail-screen';
import { RdvDocumentsPremiumPanel } from '../detail/components/RdvDocumentsPremiumPanel';
import { DetailSidebarActions } from '../detail/components/DetailSidebarActions';
import { DetailCarePhotosPanel } from '../detail/components/blocks/DetailCarePhotosPanel';
import { CancelAppointmentSheet } from '../detail/components/blocks/CancelAppointmentSheet';
import { OfferActions } from '../detail/components/OfferActions';
import { PrescriptionSection } from '../detail/components/PrescriptionSection';
import { ProPatientReviewSection } from '../detail/components/ProPatientReviewSection';
import { StaffPatientKvSection } from '../detail/components/StaffPatientKvSection';
import { PatientAssigneeRows } from '../detail/components/patient/PatientAssigneeRows';
import { RdvAppointmentInfoSection } from '../detail/components/layout/RdvAppointmentInfoSection';
import { DetailSegmentBar } from '../detail/components/layout/DetailSegmentBar';
import { RdvDetailShareFooter } from '../detail/components/layout/RdvDetailShareFooter';
import { DetailTerminalBanner } from '../detail/components/layout/DetailTerminalBanner';
import { isCarePhotoGalleryContext } from '../detail/utils/care-photo-rules';
import { reschedulePathForRole } from '../detail/utils/appointment-detail-role-config';
import { openWazeForAppointment } from '../detail/utils/open-waze';
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
  const { id } = useLocalSearchParams<{ id: string }>();
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
    if (!isPendingIncomingOffer(primary, user.id)) return;

    void (async () => {
      await openIncomingOffer(id, role, user.id);
      router.replace('/(nurse)/(tabs)/demandes' as never);
    })();
  }, [id, openIncomingOffer, primary, role, router, user?.id]);
  const showCarePhotos = Boolean(
    config.showCarePhotosBlock && primary && isCarePhotoGalleryContext(primary),
  );
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
      items.push({ id: 'photos', label: 'Photos' });
    }
    return items;
  }, [config.showDocumentsBlock, docList.length, showCarePhotos]);

  const activeSegment = segments.some((x) => x.id === segment) ? segment : 'infos';

  const isIncomingOffer =
    role === 'nurse' &&
    !!primary &&
    !!user?.id &&
    isPendingIncomingOffer(primary, user.id);

  const pullRefresh = useManualRefresh(async () => {
    s.refreshAll();
  });

  if (s.isLoading || !s.apt || !primary) {
    return (
      <View style={styles.loading}>
        <SkeletonGroup count={4} height={40} gap={8} />
      </View>
    );
  }

  if (isIncomingOffer) {
    return (
      <View style={styles.loading}>
        <SkeletonGroup count={2} height={40} gap={8} />
      </View>
    );
  }

  const { batchSorted, isMultiBatch, canceled } = s;
  const editPath = config.canReschedule && id ? reschedulePathForRole(role, id) : null;
  const showPrescription =
    role === 'pro' && config.showPrescriptionBlock && !isAppointmentCanceled(primary.status);
  const showShareFooter =
    config.showShareBlock &&
    isNursingAppointment(primary.type) &&
    primary.status !== 'completed' &&
    !canceled;

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
              <View style={styles.edgeBleed}>
                <RdvAppointmentInfoSection
                  apt={primary}
                  viewer={user}
                  edgeToEdge
                  batch={isMultiBatch ? batchSorted : undefined}
                  onAddressPress={() => openWazeForAppointment(primary)}
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
                    onReschedule={() => {
                      if (editPath) router.push(editPath as never);
                    }}
                    onCancel={() => setCancelOpen(true)}
                  />
                </View>
              ) : null}

              {showShareFooter ? (
                <RdvDetailShareFooter
                  shareData={s.shareQ.data ?? undefined}
                  loading={s.shareQ.isLoading}
                />
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
            <DetailCarePhotosPanel apt={primary} userId={user?.id} readOnly={role === 'pro'} />
          ) : null}
        </View>
      </ScrollView>

      {cancelOpen && !canceled ? (
        <CancelAppointmentSheet
          role={role}
          targets={[primary]}
          onDone={() => router.back()}
          onDismiss={() => setCancelOpen(false)}
        />
      ) : null}
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
});
