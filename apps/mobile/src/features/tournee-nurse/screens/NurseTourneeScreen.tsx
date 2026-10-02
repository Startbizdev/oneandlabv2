import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ErrorState } from '@/components/ui/ErrorState';
import { Row } from '@/components/layout/primitives';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { H_PADDING, spacing, useStyles, type Theme } from '@/theme';
import { useToast } from '@/providers/ToastProvider';
import { isManualOrderLockedError, tourOptimizeErrorMessage } from '@oneandlab/shared-api';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { PassageFab } from '@/features/nurse-passage/components/PassageFab';
import {
  PassagePlanningSheet,
  type PassagePlanningChoice,
} from '@/features/nurse-passage/components/PassagePlanningSheet';
import { PassageSimpleListRow } from '@/features/nurse-passage/components/PassageSimpleListRow';
import { PatientAbsenceSheet } from '@/features/patient-absence/components/PatientAbsenceSheet';
import {
  countTourActiveRemainingStops,
  flattenTourStopsWithSlotSections,
  isTourStopAbsent,
  isTourStopDone,
} from '@oneandlab/shared-utils';
import { useNurseTour } from '../hooks/use-nurse-tour';
import { todayTourDate } from '../hooks/nurse-tour-query';
import { useNurseTourStopCompletion } from '../hooks/use-nurse-tour-stop-status';
import { NurseNextPassageCard } from '../components/NurseNextPassageCard';
import { nursePassageDetailHref } from '../utils/passage-detail-href';
import { useTourStopActions } from '../hooks/use-tour-stop-actions';
import { useTourCalendarImport } from '../hooks/use-tour-calendar-import';
import { TourCalendarExportAction } from '../components/TourCalendarExportAction';
import { TourCalendarImportSheet } from '../components/TourCalendarImportSheet';
import { TourDayStrip } from '../components/TourDayStrip';
import { TourEmptyPanel } from '../components/TourEmptyPanel';
import { TourLoadingSkeleton } from '../components/TourLoadingSkeleton';
import { TourLocateAction } from '../components/TourLocateAction';
import { TourPassageSectionHeader } from '../components/TourPassageSectionHeader';
import { TourSlotSectionLabel } from '../components/TourSlotSectionLabel';
import { TourSortFilterSheet } from '../components/TourSortFilterSheet';
import { TourStopActionsSheet } from '../components/TourStopActionsSheet';
import { TourStopRescheduleSheet } from '../components/TourStopRescheduleSheet';
import { TourSummaryCard } from '../components/TourSummaryCard';
import type { NurseTourStop, TourSortMode } from '../api/nurse-tour.service';
import { countTodayActiveStops } from '../utils/tour-calendar';

export function NurseTourneeScreen() {
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { show: showToast } = useToast();
  const [date, setDate] = useState(todayTourDate);
  const [locating, setLocating] = useState(false);
  const [planningSheetOpen, setPlanningSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);
  const [manualOrderActive, setManualOrderActive] = useState(false);

  const {
    tour,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dayCounts,
    refreshOrigin,
    moveStop,
    optimize,
    resetOrder,
    reschedule,
    nextStop,
  } = useNurseTour(date);
  const { markDone, reopen } = useNurseTourStopCompletion(date);
  const { openStopActions, actionsSheet, rescheduleStop, closeReschedule, absenceStop, closeAbsence } =
    useTourStopActions(refetch);
  const isToday = date === todayTourDate();

  useFocusEffect(
    useCallback(() => {
      void refreshOrigin().then(() => refetch());
    }, [refreshOrigin, refetch]),
  );

  useEffect(() => {
    setManualOrderActive(false);
  }, [date]);

  const displayStops = useMemo(() => tour?.stops ?? [], [tour?.stops]);
  const { importing: exportingCalendar, importToCalendar } = useTourCalendarImport(
    date,
    displayStops,
  );
  const tourListRows = useMemo(
    () => flattenTourStopsWithSlotSections(displayStops),
    [displayStops],
  );
  const showManualReorder =
    manualOrderActive || tour?.plan.sort_mode === 'manual' || tour?.plan.manual_order_locked;

  const handleLocate = useCallback(async () => {
    setLocating(true);
    try {
      const located = await refreshOrigin();
      if (!located) {
        showToast('GPS indisponible', { type: 'error' });
        return;
      }
      const result = await refetch();
      showToast(
        result.isError ? 'Tournée non actualisée' : 'Position actualisée',
        { type: result.isError ? 'error' : 'success' },
      );
    } finally {
      setLocating(false);
    }
  }, [refreshOrigin, refetch, showToast]);

  const handleOptimize = useCallback(
    async (mode: TourSortMode, force?: boolean) => {
      try {
        await optimize(mode, force);
        setManualOrderActive(mode === 'manual');
        showToast('Ordre mis à jour', { type: 'success' });
      } catch (e) {
        if (e instanceof ApiRequestError && isManualOrderLockedError(e.status, e.code)) void refetch();
        handleApiError(e, showToast, 'nurse-tour-optimize', 'Optimisation impossible', tourOptimizeErrorMessage);
      }
    },
    [optimize, refetch, showToast],
  );

  const handleMove = useCallback(
    async (id: string, dir: 'up' | 'down') => {
      try {
        await moveStop(id, dir);
        setManualOrderActive(true);
        showToast('Ordre enregistré', { type: 'success' });
      } catch (e) {
        console.warn('[tour] réordonnancement impossible', e);
        showToast('Enregistrement impossible', { type: 'error' });
      }
    },
    [moveStop, showToast],
  );

  const openPassageDetail = useCallback(
    (stop: NurseTourStop) => {
      router.push(nursePassageDetailHref(stop));
    },
    [router],
  );

  const handlePlanningChoice = useCallback(
    (choice: PassagePlanningChoice) => {
      router.push({
        pathname: '/(nurse)/passage/patient-pick',
        params: { start_date: date, mode: choice },
      });
    },
    [date, router],
  );

  const hasStops = displayStops.length > 0;
  const absentCount = tour?.summary.absent_stops ?? 0;
  const showTourSummary =
    Boolean(tour) && ((tour?.summary.total_stops ?? 0) > 0 || absentCount > 0);

  const sortFilterActive = Boolean(
    tour && (tour.plan.sort_mode !== 'smart' || tour.plan.manual_order_locked),
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        {showTourSummary && tour ? (
          <TourSummaryCard
            summary={tour.summary}
            activeRemaining={countTourActiveRemainingStops(displayStops)}
          />
        ) : null}
        {isToday && tour && nextStop ? (
          <NurseNextPassageCard tour={tour} stop={nextStop} onMarkDone={markDone} />
        ) : null}
        {hasStops ? (
          <TourPassageSectionHeader
            sortActive={sortFilterActive}
            absentCount={absentCount}
            activeTotal={tour?.summary.total_stops ?? 0}
            onOpenFilter={() => setSortSheetOpen(true)}
          />
        ) : null}
      </View>
    ),
    [
      absentCount,
      displayStops,
      hasStops,
      isToday,
      markDone,
      nextStop,
      showTourSummary,
      sortFilterActive,
      tour,
      styles.listHeader,
    ],
  );

  return (
    <StackChromeScreen
      headerRight={
        <Row align="center">
          <TourCalendarExportAction
            onPress={() => setCalendarSheetOpen(true)}
            loading={exportingCalendar}
          />
          <TourLocateAction onPress={() => void handleLocate()} loading={locating} />
        </Row>
      }
    >
      <View style={styles.container}>
        <View style={[styles.headerZone, { paddingTop: spacing[3] }]}>
          <TourDayStrip
            embedded
            selectedDate={date}
            dayCounts={dayCounts}
            onSelectDate={setDate}
          />
        </View>

        {isLoading ? (
          <TourLoadingSkeleton />
        ) : isError && !tour ? (
          <View style={styles.errorWrap}>
            <ErrorState
              title="Tournée indisponible"
              error={error}
              onRetry={() => void refetch()}
            />
          </View>
        ) : (
          <FlatList
            data={tourListRows}
            keyExtractor={(item) => item.key}
            extraData={`${tour?.summary.done_stops}/${tour?.summary.total_stops}`}
            contentContainerStyle={[
              styles.list,
              !hasStops && styles.listEmpty,
            ]}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={<TourEmptyPanel date={date} />}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={() => void refetch()}
              />
            }
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              if (!tour) return null;
              if (item.kind === 'section') {
                return <TourSlotSectionLabel label={item.label} />;
              }
              const stop = item.stop;
              const toggleDone = () => {
                if (isTourStopAbsent(stop)) {
                  openStopActions(stop);
                  return;
                }
                void (isTourStopDone(stop) ? reopen(stop) : markDone(stop));
              };
              return (
                <PassageSimpleListRow
                  stop={stop}
                  index={item.index}
                  total={displayStops.length}
                  isNext={stop.stop_id === tour.next_stop_id}
                  onPressName={() => openPassageDetail(stop)}
                  onToggleDone={toggleDone}
                  onManageAbsence={() => openStopActions(stop)}
                  onMoveUp={
                    showManualReorder ? () => void handleMove(stop.appointment_id, 'up') : undefined
                  }
                  onMoveDown={
                    showManualReorder ? () => void handleMove(stop.appointment_id, 'down') : undefined
                  }
                />
              );
            }}
          />
        )}
      </View>

      <PassageFab onPress={() => setPlanningSheetOpen(true)} />

      <PassagePlanningSheet
        visible={planningSheetOpen}
        selectedDate={date}
        onClose={() => setPlanningSheetOpen(false)}
        onSelect={handlePlanningChoice}
      />

      {absenceStop?.patient_id ? (
        <PatientAbsenceSheet
          visible={Boolean(absenceStop)}
          patientId={absenceStop.patient_id}
          patientName={absenceStop.patient_name}
          defaultStartDate={date}
          existing={absenceStop.patient_absence ?? null}
          onClose={closeAbsence}
          onSaved={() => {
            showToast('Tournée actualisée', { type: 'success' });
            void refetch();
          }}
        />
      ) : null}

      {tour && hasStops ? (
        <TourSortFilterSheet
          visible={sortSheetOpen}
          active={tour.plan.sort_mode}
          locked={tour.plan.manual_order_locked}
          onClose={() => setSortSheetOpen(false)}
          onSelect={handleOptimize}
          onReset={() => void resetOrder()}
        />
      ) : null}

      <TourCalendarImportSheet
        visible={calendarSheetOpen}
        selectedDate={date}
        todayCount={countTodayActiveStops(tour?.stops ?? [])}
        onClose={() => setCalendarSheetOpen(false)}
        onSelect={(scope) => void importToCalendar(scope)}
      />

      <TourStopActionsSheet {...actionsSheet} />

      <TourStopRescheduleSheet
        stop={rescheduleStop}
        visible={Boolean(rescheduleStop)}
        onClose={closeReschedule}
        onConfirm={async (payload) => {
          if (!rescheduleStop) return;
          await reschedule(rescheduleStop.stop_id, payload);
          showToast('Créneau mis à jour, patient prévenu', { type: 'success' });
        }}
      />
    </StackChromeScreen>
  );
}

function buildStyles({ colors: c }: Theme) {
  return {
    container: {
      flex: 1,
      minWidth: 0,
      backgroundColor: c.background,
    },
    headerZone: {
      backgroundColor: c.surface,
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[2],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    list: {
      paddingTop: spacing[2],
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[10] + spacing[16],
    },
    listHeader: {
      alignSelf: 'stretch' as const,
      width: '100%' as const,
      overflow: 'visible' as const,
    },
    listEmpty: {
      minWidth: 0,
      flexGrow: 1,
    },
    errorWrap: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center' as const,
      paddingHorizontal: H_PADDING,
    },
  };
}
