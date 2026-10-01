import { spacing, useStyles } from '@/theme';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { SkeletonPatientAppointmentDetail } from '@/components/ui/skeletons';
import { SceneScrollView } from '@/components/navigation/SceneScrollView';
import { ScreenActionLayout } from '@/components/layout/ScreenActionLayout';
import { useAppointmentDetailScreen } from '../detail/hooks/use-appointment-detail-screen';
import { AppointmentDetailBlockedEmptyState } from '../detail/components/AppointmentDetailBlockedEmptyState';
import { AppointmentDetailLoadError } from '../detail/components/AppointmentDetailLoadError';
import { PatientAppointmentSummaryHeader } from '../detail/components/patient/PatientAppointmentSummaryHeader';
import { PatientAssigneeRows, hasAssigneeContent } from '../detail/components/patient/PatientAssigneeRows';
import { PatientCancelAppointmentSheet } from '../detail/components/patient/PatientCancelAppointmentSheet';
import { PatientDetailActions } from '../detail/components/patient/PatientDetailActions';
import { PatientDetailStickyActions } from '../detail/components/patient/PatientDetailStickyActions';
import { PatientCompletedReviewPrompt } from '../detail/components/patient/PatientCompletedReviewPrompt';
import { PatientPreleveurAlerts } from '../detail/components/patient/PatientEngagementSections';
import { RdvDocumentsPremiumPanel } from '../detail/components/RdvDocumentsPremiumPanel';
import { RdvCancellationBanner } from '../detail/components/RdvCancellationBanner';
import { RdvAppointmentInfoSection } from '../detail/components/layout/RdvAppointmentInfoSection';
import { DetailSegmentBar } from '../detail/components/layout/DetailSegmentBar';
import { DetailTerminalBanner } from '../detail/components/layout/DetailTerminalBanner';
import { filterListDocuments } from '../detail/utils/document-labels';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { getAppointmentSidebarTerminalEmpty } from '@/utils/appointment-sidebar-terminal';
import { batchHasReviewableAppointment } from '@/utils/can-leave-review';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { appointmentConversationHref } from '../detail/utils/conversation-navigation';

type SegmentId = 'infos' | 'documents';

const SCREEN_TITLE = 'Rendez-vous';

export function PatientAppointmentDetailScreen() {
  const styles = useStyles(buildStyles);

  const { id, segment: segmentParam } = useLocalSearchParams<{
    id: string;
    segment?: string;
  }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [segment, setSegment] = useState<SegmentId>('infos');

  const s = useAppointmentDetailScreen('patient', id);

  const primary = s.primary;

  const documentsCount = useMemo(
    () =>
      filterListDocuments(
        s.allDocuments.filter((d) => d.document_type !== 'cancellation_photo'),
        { omitCarePhotos: true },
      ).length,
    [s.allDocuments],
  );

  const showReviewPrompt = useMemo(
    () => batchHasReviewableAppointment(s.batchSorted),
    [s.batchSorted],
  );

  const segments = useMemo((): { id: SegmentId; label: string; badge?: number }[] => {
    return [
      { id: 'infos', label: 'Informations' },
      { id: 'documents', label: 'Documents', badge: documentsCount || undefined },
    ];
  }, [documentsCount]);

  const activeSegment = segments.some((x) => x.id === segment) ? segment : 'infos';

  useEffect(() => {
    const raw = Array.isArray(segmentParam) ? segmentParam[0] : segmentParam;
    if (raw !== 'documents') return;
    setSegment(raw);
    router.setParams({ segment: undefined });
  }, [segmentParam, router]);

  const pullRefresh = useManualRefresh(async () => {
    s.refreshAll();
  });

  if (s.detailBlock) {
    return (
      <StackChromeScreen title={SCREEN_TITLE}>
        <AppointmentDetailBlockedEmptyState
          onBack={() => router.back()}
          block={s.detailBlock}
        />
      </StackChromeScreen>
    );
  }

  if (s.detailError) {
    return (
      <StackChromeScreen title={SCREEN_TITLE}>
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
      <StackChromeScreen title={SCREEN_TITLE}>
        <SkeletonPatientAppointmentDetail />
      </StackChromeScreen>
    );
  }

  const { batchSorted, isMultiBatch, canceled, cancellableForPatient } = s;
  const terminal = getAppointmentSidebarTerminalEmpty(primary.status);
  const canEditSchedule =
    !canceled && String(primary.status ?? '').toLowerCase() === 'pending';

  return (
    <>
      <StackChromeScreen title={SCREEN_TITLE}>
        <ScreenActionLayout
          footer={
            <PatientDetailStickyActions
              onOpenMessages={
                canceled
                  ? undefined
                  : () => router.push(appointmentConversationHref('patient', String(id)))
              }
              onEditSchedule={
                canEditSchedule
                  ? () =>
                      router.push({
                        pathname: '/(patient)/appointment/[id]/edit-schedule',
                        params: { id: String(id) },
                      })
                  : undefined
              }
            />
          }
        >
          <SceneScrollView
            contentContainerStyle={[styles.scroll, styles.content]}
            refreshing={pullRefresh.refreshing}
            onRefresh={pullRefresh.onRefresh}
          >
            <PatientAppointmentSummaryHeader
              apt={primary}
              batchCount={batchSorted.length}
              assigneeShownElsewhere={
                activeSegment === 'infos' && hasAssigneeContent(primary, user?.role ?? 'patient', user?.id)
              }
            />

            {terminal ? <DetailTerminalBanner terminal={terminal} /> : null}

            {showReviewPrompt ? (
              <PatientCompletedReviewPrompt batch={batchSorted} onRefresh={s.refreshAll} />
            ) : null}

            <PatientPreleveurAlerts batch={batchSorted} />

            {!isMultiBatch && isAppointmentCanceled(primary.status) ? (
              <RdvCancellationBanner apt={primary} />
            ) : null}

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
                />
                <PatientAssigneeRows apt={primary} />
                <PatientDetailActions
                  canceled={canceled}
                  cancelCount={cancellableForPatient.length}
                  onCancel={() => setCancelOpen(true)}
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
                error={s.docsError}
                onRetry={s.retryDocs}
              />
            ) : null}
          </SceneScrollView>
        </ScreenActionLayout>
      </StackChromeScreen>

      <PatientCancelAppointmentSheet
        visible={cancelOpen && cancellableForPatient.length > 0}
        targets={cancellableForPatient}
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
    paddingBottom: spacing[6],
  },
  content: {
    alignSelf: 'stretch' as const,
    width: '100%' as const,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    gap: spacing[3],
  },
  tabBody: { gap: spacing[3] },
};
}
