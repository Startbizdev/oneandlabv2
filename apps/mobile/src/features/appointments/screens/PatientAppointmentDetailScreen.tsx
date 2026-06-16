import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { spacing } from '@/theme';
import { useEffect, useMemo, useState } from 'react';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { KeyboardScrollView } from '@/components/layout/KeyboardScrollView';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { SkeletonPatientAppointmentDetail } from '@/components/ui/skeletons';
import { useAppointmentDetailScreen } from '../detail/hooks/use-appointment-detail-screen';
import { AppointmentDetailBlockedEmptyState } from '../detail/components/AppointmentDetailBlockedEmptyState';
import { CancelAppointmentSheet } from '../detail/components/blocks/CancelAppointmentSheet';
import { PatientAssigneeRows } from '../detail/components/patient/PatientAssigneeRows';
import { PatientDetailActions } from '../detail/components/patient/PatientDetailActions';
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
import { spreadTabSceneScrollProps } from '@/components/navigation/liquid-glass-header-inset';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackScrollConfig } from '@/navigation/use-stack-scroll-config';

type SegmentId = 'infos' | 'documents';

export function PatientAppointmentDetailScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_screens_PatientAppointmentDetailScreen_tsx_PatientAppointmentDetailScreen_styles');

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
    router.setParams({ segment: undefined } as never);
  }, [segmentParam, router]);

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

  if (s.isLoading || !s.apt || !primary) {
    return (
      <StackChromeScreen>
        <SkeletonPatientAppointmentDetail />
      </StackChromeScreen>
    );
  }

  const { batchSorted, isMultiBatch, canceled, cancellableForPatient } = s;
  const terminal = getAppointmentSidebarTerminalEmpty(primary.status);

  return (
    <>
      <StackChromeScreen>
        <KeyboardScrollView
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
              <View style={styles.edgeBleed}>
                <PatientDetailActions
                  batch={batchSorted}
                  canceled={canceled}
                  cancelCount={cancellableForPatient.length}
                  onCancel={() => setCancelOpen(true)}
                />
              </View>
            </View>
          ) : null}

          {activeSegment === 'documents' ? (
            <RdvDocumentsPremiumPanel
              appointmentId={id!}
              apt={primary}
              role="patient"
              docs={s.allDocuments}
              loading={s.docsLoading}
            />
          ) : null}
        </KeyboardScrollView>
      </StackChromeScreen>

      <CancelAppointmentSheet
        visible={cancelOpen && cancellableForPatient.length > 0}
        role="patient"
        targets={cancellableForPatient}
        onDone={() => router.back()}
        onClose={() => setCancelOpen(false)}
      />
    </>
  );
}

function buildStyles(c: AppColors) {
  return {
  container: { minWidth: 0, flex: 1, backgroundColor: c.background },
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
};
}
