import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, FlatList, Platform, RefreshControl, StyleSheet, View } from 'react-native';
import dayjs from 'dayjs';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { Row } from '@/components/layout/primitives';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackContentTopInset } from '@/navigation/use-stack-scroll-config';
import { H_PADDING, spacing } from '@/theme';
import { useToast } from '@/providers/ToastProvider';
import { PassageFab } from '@/features/nurse-passage/components/PassageFab';
import {
  PassagePlanningSheet,
  type PassagePlanningChoice,
} from '@/features/nurse-passage/components/PassagePlanningSheet';
import { PassageSimpleListRow } from '@/features/nurse-passage/components/PassageSimpleListRow';
import { PatientAbsenceSheet } from '@/features/patient-absence/components/PatientAbsenceSheet';
import { deletePatientAbsence } from '@/features/patient-absence/api/patient-absence.service';
import { countTourActiveRemainingStops, flattenTourStopsWithSlotSections, isTourStopAbsent } from '@oneandlab/shared-utils';
import { useNurseTour } from '../hooks/use-nurse-tour';
import { TourCalendarExportAction } from '../components/TourCalendarExportAction';
import {
  TourCalendarImportSheet,
  type TourCalendarImportScope,
} from '../components/TourCalendarImportSheet';
import { TourDayStrip } from '../components/TourDayStrip';
import { TourEmptyPanel } from '../components/TourEmptyPanel';
import { TourLoadingSkeleton } from '../components/TourLoadingSkeleton';
import { TourLocateAction } from '../components/TourLocateAction';
import { TourPassageSectionHeader } from '../components/TourPassageSectionHeader';
import { TourSlotSectionLabel } from '../components/TourSlotSectionLabel';
import { TourSortFilterSheet } from '../components/TourSortFilterSheet';
import { TourStopRescheduleSheet } from '../components/TourStopRescheduleSheet';
import { TourSummaryCard } from '../components/TourSummaryCard';
import type { NurseTourStop, TourSortMode } from '../api/nurse-tour.service';
import { countTodayActiveStops, importTourToDeviceCalendar } from '../utils/tour-calendar';

export function NurseTourneeScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const router = useRouter();
  const { show: showToast } = useToast();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [locating, setLocating] = useState(false);
  const [exportingCalendar, setExportingCalendar] = useState(false);
  const [rescheduleStop, setRescheduleStop] = useState<NurseTourStop | null>(null);
  const [planningSheetOpen, setPlanningSheetOpen] = useState(false);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);
  const [manualOrderActive, setManualOrderActive] = useState(false);
  const [absenceStop, setAbsenceStop] = useState<NurseTourStop | null>(null);

  const contentTopInset = useStackContentTopInset();
  const sceneInsets = useTabSceneInsets();
  const listScrollConfig = buildTabSceneScrollConfig(
    { insetTop: 0, insetBottom: sceneInsets.insetBottom },
    styles.list,
    { extraTop: spacing[2], extraBottom: spacing[16] },
  );

  const {
    tour,
    isLoading,
    isFetching,
    refetch,
    dayCounts,
    refreshCoords,
    moveStop,
    optimize,
    resetOrder,
    setStatus,
    reschedule,
  } = useNurseTour(date);

  useEffect(() => {
    void refreshCoords();
  }, [refreshCoords]);

  useFocusEffect(
    useCallback(() => {
      void refreshCoords();
      void refetch();
    }, [refreshCoords, refetch]),
  );

  useEffect(() => {
    setManualOrderActive(false);
  }, [date]);

  const displayStops = tour?.stops ?? [];
  const tourListRows = useMemo(
    () => flattenTourStopsWithSlotSections(displayStops),
    [displayStops],
  );
  const showManualReorder =
    manualOrderActive || tour?.plan.sort_mode === 'manual' || tour?.plan.manual_order_locked;

  const handleLocate = useCallback(async () => {
    setLocating(true);
    try {
      await refreshCoords();
      await refetch();
      showToast('Position actualisée', { type: 'success' });
    } catch {
      showToast('GPS indisponible', { type: 'error' });
    } finally {
      setLocating(false);
    }
  }, [refreshCoords, refetch, showToast]);

  const handleOptimize = useCallback(
    async (mode: TourSortMode, force?: boolean) => {
      try {
        await optimize(mode, force);
        setManualOrderActive(mode === 'manual');
        showToast('Ordre mis à jour', { type: 'success' });
      } catch {
        showToast('Optimisation impossible', { type: 'error' });
      }
    },
    [optimize, showToast],
  );

  const handleMove = useCallback(
    async (id: string, dir: 'up' | 'down') => {
      try {
        await moveStop(id, dir);
        setManualOrderActive(true);
        showToast('Ordre enregistré', { type: 'success' });
      } catch {
        showToast('Enregistrement impossible', { type: 'error' });
      }
    },
    [moveStop, showToast],
  );

  const openPassageDetail = useCallback(
    (stop: NurseTourStop) => {
      if (stop.passage_series_id) {
        router.push({
          pathname: '/(nurse)/passage/[seriesId]',
          params: {
            seriesId: stop.passage_series_id,
            appointment_id: stop.appointment_id,
            stop_id: stop.stop_id,
          },
        } as never);
        return;
      }
      router.push({
        pathname: '/(nurse)/passage/[seriesId]',
        params: {
          seriesId: 'rdv',
          appointment_id: stop.appointment_id,
          stop_id: stop.stop_id,
        },
      } as never);
    },
    [router],
  );

  const reportCalendarImportResult = useCallback(
    (result: Awaited<ReturnType<typeof importTourToDeviceCalendar>>) => {
      if (result.ok && result.mode === 'native') {
        showToast(
          `${result.count} rendez-vous ajouté${result.count > 1 ? 's' : ''} à votre calendrier`,
          { type: 'success' },
        );
        return;
      }
      if (result.ok && result.mode === 'share') {
        showToast('Choisissez Calendrier pour importer vos rendez-vous', { type: 'success' });
        return;
      }
      if (!result.ok) {
        if (result.reason === 'no_events') {
          showToast('Aucun rendez-vous à ajouter au calendrier', { type: 'error' });
          return;
        }
        if (result.reason === 'permission') {
          showToast('Autorisez Cary à accéder à votre calendrier dans Réglages', { type: 'error' });
          return;
        }
        showToast('Ajout au calendrier impossible', { type: 'error' });
      }
    },
    [showToast],
  );

  const handleCalendarImport = useCallback(
    async (scope: TourCalendarImportScope) => {
      setExportingCalendar(true);
      try {
        const result = await importTourToDeviceCalendar({
          scope,
          date,
          todayStops: tour?.stops ?? [],
        });
        reportCalendarImportResult(result);
      } catch {
        showToast('Ajout au calendrier impossible', { type: 'error' });
      } finally {
        setExportingCalendar(false);
      }
    },
    [date, reportCalendarImportResult, showToast, tour?.stops],
  );

  const openCalendarImportSheet = useCallback(() => {
    setCalendarSheetOpen(true);
  }, []);

  const handlePlanningChoice = useCallback(
    (choice: PassagePlanningChoice) => {
      setPlanningSheetOpen(false);
      router.push({
        pathname: '/(nurse)/passage/patient-pick',
        params: { start_date: date, mode: choice },
      } as never);
    },
    [date, router],
  );

  const openAbsenceSheet = useCallback((stop: NurseTourStop) => {
    if (!stop.patient_id) {
      showToast('Patient introuvable pour cette absence', { type: 'error' });
      return;
    }
    setAbsenceStop(stop);
  }, [showToast]);

  const handleManageAbsence = useCallback(
    (stop: NurseTourStop) => {
      if (!stop.patient_id) {
        showToast('Patient introuvable pour cette absence', { type: 'error' });
        return;
      }
      const absent = isTourStopAbsent(stop);
      const absenceId = stop.patient_absence?.id;

      const liftAbsence = () => {
        if (!absenceId) {
          openAbsenceSheet(stop);
          return;
        }
        void (async () => {
          try {
            await deletePatientAbsence(stop.patient_id!, absenceId);
            showToast('Absence levée — patient de retour', { type: 'success' });
            void refetch();
          } catch {
            showToast('Suppression impossible', { type: 'error' });
          }
        })();
      };

      const actions = [
        {
          text: absent ? 'Modifier l\'absence' : 'Déclarer une absence',
          onPress: () => openAbsenceSheet(stop),
        },
        ...(absent
          ? [
              {
                text: 'Patient de retour — lever l\'absence',
                style: 'destructive' as const,
                onPress: liftAbsence,
              },
            ]
          : []),
        { text: 'Annuler', style: 'cancel' as const },
      ];

      if (Platform.OS === 'ios') {
        const labels = actions.map((a) => a.text);
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: labels,
            cancelButtonIndex: labels.length - 1,
            destructiveButtonIndex: absent ? 1 : undefined,
          },
          (i) => actions[i]?.onPress?.(),
        );
        return;
      }
      Alert.alert(stop.patient_name, undefined, actions);
    },
    [openAbsenceSheet, refetch, showToast],
  );

  const hasStops = displayStops.length > 0;
  const absentCount = tour?.summary.absent_stops ?? 0;
  const showTourSummary =
    Boolean(tour) && ((tour?.summary.total_stops ?? 0) > 0 || absentCount > 0);

  const sortFilterActive = Boolean(
    tour && (tour.plan.sort_mode !== 'smart' || tour.plan.manual_order_locked),
  );

  const listHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        {showTourSummary && tour ? (
          <TourSummaryCard
            summary={tour.summary}
            activeRemaining={countTourActiveRemainingStops(displayStops)}
          />
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
    [absentCount, displayStops, hasStops, showTourSummary, sortFilterActive, tour, styles.listHeader],
  );

  return (
    <StackChromeScreen
      headerRight={
        <Row align="center">
          <TourCalendarExportAction
            onPress={openCalendarImportSheet}
            loading={exportingCalendar}
          />
          <TourLocateAction onPress={() => void handleLocate()} loading={locating} />
        </Row>
      }
    >
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={[styles.headerZone, { paddingTop: contentTopInset, backgroundColor: c.background }]}>
          <TourDayStrip
            embedded
            selectedDate={date}
            dayCounts={dayCounts}
            onSelectDate={setDate}
          />
        </View>

        {isLoading ? (
          <TourLoadingSkeleton />
        ) : (
          <FlatList
            data={tourListRows}
            keyExtractor={(item) => item.key}
            extraData={`${tour?.summary.done_stops}/${tour?.summary.total_stops}`}
            {...spreadTabSceneScrollProps(listScrollConfig)}
            contentContainerStyle={[
              listScrollConfig.contentContainerStyle,
              !hasStops && styles.listEmpty,
            ]}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={<TourEmptyPanel date={date} />}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={() => void refetch()}
                progressViewOffset={listScrollConfig.refreshProgressOffset}
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
                  handleManageAbsence(stop);
                  return;
                }
                const isDone =
                  stop.visit_status === 'done' ||
                  stop.visit_status === 'skipped' ||
                  stop.status === 'completed';
                void setStatus(stop.stop_id, isDone ? 'todo' : 'done');
              };
              return (
                <PassageSimpleListRow
                  stop={stop}
                  index={item.index}
                  total={displayStops.length}
                  isNext={stop.stop_id === tour.next_stop_id}
                  onPressName={() => openPassageDetail(stop)}
                  onToggleDone={toggleDone}
                  onManageAbsence={() => handleManageAbsence(stop)}
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
          onClose={() => setAbsenceStop(null)}
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
        onSelect={(scope) => void handleCalendarImport(scope)}
      />

      <TourStopRescheduleSheet
        stop={rescheduleStop}
        visible={Boolean(rescheduleStop)}
        onClose={() => setRescheduleStop(null)}
        onConfirm={async (payload) => {
          if (!rescheduleStop) return;
          await reschedule(rescheduleStop.stop_id, payload);
          showToast('Créneau mis à jour — patient prévenu', { type: 'success' });
        }}
      />
    </StackChromeScreen>
  );
}

function buildStyles(c: AppColors) {
  return {
    container: {
      flex: 1,
      minWidth: 0,
    },
    headerZone: {
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[2],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    list: {
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[10],
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
  };
}
