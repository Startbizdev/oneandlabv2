import { spacing, useStyles } from '@/theme';
import { useMemo, useState } from 'react';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useAuthStore } from '@/store/auth-store';
import { SkeletonPatientAppointmentDetail } from '@/components/ui/skeletons';
import { SceneScrollView } from '@/components/navigation/SceneScrollView';
import { ScreenActionLayout } from '@/components/layout/ScreenActionLayout';
import { SettingsSection } from '@/components/ui/SettingsSection';
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
import { RdvCancellationBanner } from '../detail/components/RdvCancellationBanner';
import { RdvAppointmentInfoSection } from '../detail/components/layout/RdvAppointmentInfoSection';
import { DetailTerminalBanner } from '../detail/components/layout/DetailTerminalBanner';
import { appointmentListDocuments } from '../detail/utils/appointment-documents-list';
import { appointmentDocumentsRow } from '../detail/utils/appointment-documents-row';
import { isAppointmentCanceled } from '@/utils/appointment-detail-display';
import { getAppointmentSidebarTerminalEmpty } from '@/utils/appointment-sidebar-terminal';
import { batchHasReviewableAppointment } from '@/utils/can-leave-review';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { appointmentDocumentsHref } from '@/navigation/role-hrefs';
import { appointmentConversationHref } from '../detail/utils/conversation-navigation';

const SCREEN_TITLE = 'Rendez-vous';

export function PatientAppointmentDetailScreen() {
  const styles = useStyles(buildStyles);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const [cancelOpen, setCancelOpen] = useState(false);

  const s = useAppointmentDetailScreen('patient', id);

  const primary = s.primary;

  const documents = useMemo(
    () => appointmentListDocuments(s.allDocuments, 'patient', true),
    [s.allDocuments],
  );

  const showReviewPrompt = useMemo(
    () => batchHasReviewableAppointment(s.batchSorted),
    [s.batchSorted],
  );

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
  const documentsRow = appointmentDocumentsRow({
    documents,
    loading: s.docsLoading,
    failed: Boolean(s.docsError),
    appointmentStatus: primary.status,
    onPress: () => router.push(appointmentDocumentsHref('/(patient)', String(id))),
  });

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
              assigneeShownElsewhere={hasAssigneeContent(primary, user?.role ?? 'patient', user?.id)}
            />

            {terminal ? <DetailTerminalBanner terminal={terminal} /> : null}

            {showReviewPrompt ? (
              <PatientCompletedReviewPrompt batch={batchSorted} onRefresh={s.refreshAll} />
            ) : null}

            <PatientPreleveurAlerts batch={batchSorted} />

            {!isMultiBatch && isAppointmentCanceled(primary.status) ? (
              <RdvCancellationBanner apt={primary} />
            ) : null}

            <RdvAppointmentInfoSection
              apt={primary}
              viewer={user}
              batch={isMultiBatch ? batchSorted : undefined}
              batchLoading={s.siblingsLoading}
            />
            <PatientAssigneeRows apt={primary} />
            {documentsRow ? <SettingsSection items={[documentsRow]} /> : null}
            <PatientDetailActions
              canceled={canceled}
              cancelCount={cancellableForPatient.length}
              onCancel={() => setCancelOpen(true)}
            />
          </SceneScrollView>
        </ScreenActionLayout>
      </StackChromeScreen>

      <PatientCancelAppointmentSheet
        visible={cancelOpen && cancellableForPatient.length > 0}
        targets={cancellableForPatient}
        onDone={() => navigation.goBack()}
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
};
}
