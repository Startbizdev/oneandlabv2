import { useMemo, useRef, useState } from 'react';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import {
  RefreshControl,
  StyleSheet,
  View,
  type ScrollView as ScrollViewType,
} from 'react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { SkeletonPatientAppointmentDetail } from '@/components/ui/skeletons';
import { useAppointmentDetailScreen } from '../detail/hooks/use-appointment-detail-screen';
import { CancelAppointmentSheet } from '../detail/components/blocks/CancelAppointmentSheet';
import { PatientRdvUnifiedCard } from '../detail/components/patient/PatientRdvUnifiedCard';
import { PatientAssigneeRows } from '../detail/components/patient/PatientAssigneeRows';
import { PatientDetailHubCard } from '../detail/components/patient/PatientDetailHubCard';
import { RdvDocumentsPremiumPanel } from '../detail/components/RdvDocumentsPremiumPanel';
import {
  PatientPreleveurAlerts,
  PatientReviewsSection,
} from '../detail/components/patient/PatientEngagementSections';
import { RdvCancellationBanner } from '../detail/components/RdvCancellationBanner';
import { RdvAppointmentInfoSection } from '../detail/components/layout/RdvAppointmentInfoSection';
import { DetailSegmentBar } from '../detail/components/layout/DetailSegmentBar';
import { DetailTerminalBanner } from '../detail/components/layout/DetailTerminalBanner';
import { filterListDocuments } from '../detail/utils/document-labels';
import { fetchAppointmentsPaginated } from '../api/appointments.service';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { getAppointmentSidebarTerminalEmpty } from '@/utils/appointment-sidebar-terminal';
import { batchHasReviewableAppointment } from '@/utils/can-leave-review';
import type { Appointment } from '@oneandlab/shared-types';
import { colors, spacing } from '@/theme';

const PAST_STATUSES = 'completed,canceled,cancelled,refused,expired';

type SegmentId = 'infos' | 'documents' | 'avis';

export function PatientAppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [segment, setSegment] = useState<SegmentId>('infos');
  const scrollRef = useRef<ScrollViewType>(null);
  const reviewsOffset = useRef(0);

  const s = useAppointmentDetailScreen('patient', id);

  const primary = s.primary;
  const relativeId = (primary as Appointment & { relative_id?: string } | undefined)?.relative_id ?? null;

  const historyCountQ = useQuery({
    queryKey: ['patient', 'history-count', id, relativeId] as const,
    queryFn: async () => {
      const { appointments } = await fetchAppointmentsPaginated({
        page: 1,
        limit: 120,
        status: PAST_STATUSES,
      });
      let list = appointments.filter((a) => a.id !== id);
      if (relativeId) {
        list = list.filter(
          (a) =>
            String((a as Appointment & { relative_id?: string }).relative_id ?? '') ===
            relativeId,
        );
      }
      return list.length;
    },
    enabled: Boolean(id && primary),
  });

  const documentsCount = useMemo(
    () =>
      filterListDocuments(
        s.allDocuments.filter((d) => d.document_type !== 'cancellation_photo'),
        { omitCarePhotos: true },
      ).length,
    [s.allDocuments],
  );

  const showReviewsTab = useMemo(
    () => batchHasReviewableAppointment(s.batchSorted),
    [s.batchSorted],
  );

  const segments = useMemo((): { id: SegmentId; label: string; badge?: number }[] => {
    const base: { id: SegmentId; label: string; badge?: number }[] = [
      { id: 'infos', label: 'Informations' },
      { id: 'documents', label: 'Documents', badge: documentsCount || undefined },
    ];
    if (showReviewsTab) base.push({ id: 'avis', label: 'Avis' });
    return base;
  }, [documentsCount, showReviewsTab]);

  const activeSegment = segments.some((x) => x.id === segment) ? segment : 'infos';

  const pullRefresh = useManualRefresh(async () => {
    s.refreshAll();
  });

  if (s.isLoading || !s.apt || !primary) {
    return <SkeletonPatientAppointmentDetail />;
  }

  const { batchSorted, isMultiBatch, canceled, cancellableForPatient } = s;
  const terminal = getAppointmentSidebarTerminalEmpty(primary.status);

  return (
    <>
      <KeyboardScrollView
        ref={scrollRef}
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

          <PatientPreleveurAlerts batch={batchSorted} />

          {!isMultiBatch && isAppointmentCanceled(primary.status) ? (
            <RdvCancellationBanner apt={primary} />
          ) : null}

          <DetailSegmentBar
            segments={segments}
            active={activeSegment}
            onChange={(sid) => {
              if (sid === 'avis') {
                scrollRef.current?.scrollTo({
                  y: Math.max(0, reviewsOffset.current - spacing[2]),
                  animated: true,
                });
              }
              setSegment(sid as SegmentId);
            }}
          />

          {activeSegment === 'infos' ? (
            <View style={styles.tabBody}>
              <View style={styles.edgeBleed}>
                <RdvAppointmentInfoSection
                  apt={primary}
                  viewer={user}
                  edgeToEdge
                  batch={isMultiBatch ? batchSorted : undefined}
                  batchLoading={s.siblingsLoading}
                />
              </View>
              <PatientAssigneeRows apt={primary} />
              <PatientRdvUnifiedCard
                primary={primary}
                batch={batchSorted}
                isMultiBatch={isMultiBatch}
                viewer={user}
                hideCareDetails
                canceled={canceled}
                cancelCount={cancellableForPatient.length}
                onCancel={() => setCancelOpen(true)}
                onScrollToReviews={() => setSegment('avis')}
              />
              <PatientDetailHubCard
                documentsCount={documentsCount}
                historyCount={historyCountQ.data}
                onDocuments={() => router.push(`/(patient)/appointment/${id}/documents` as never)}
                onHistory={() => router.push(`/(patient)/appointment/${id}/history` as never)}
              />
            </View>
          ) : null}

          {activeSegment === 'documents' ? (
            <RdvDocumentsPremiumPanel
              appointmentId={id!}
              apt={primary}
              role="patient"
              docs={s.allDocuments}
              loading={s.docsLoading}
              embedded
            />
          ) : null}

          {activeSegment === 'avis' ? (
            <View onLayout={(e) => { reviewsOffset.current = e.nativeEvent.layout.y; }}>
              <PatientReviewsSection batch={batchSorted} onRefresh={s.refreshAll} />
            </View>
          ) : null}
        </View>
      </KeyboardScrollView>

      {cancelOpen && cancellableForPatient.length > 0 ? (
        <CancelAppointmentSheet
          role="patient"
          targets={cancellableForPatient}
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
