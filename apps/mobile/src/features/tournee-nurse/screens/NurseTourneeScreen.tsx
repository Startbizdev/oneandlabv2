import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
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
import { useNurseTour } from '../hooks/use-nurse-tour';
import { TourCalendarExportAction } from '../components/TourCalendarExportAction';
import { TourDayStrip } from '../components/TourDayStrip';
import { TourEmptyPanel } from '../components/TourEmptyPanel';
import { TourLoadingSkeleton } from '../components/TourLoadingSkeleton';
import { TourLocateAction } from '../components/TourLocateAction';
import { TourPassageSectionHeader } from '../components/TourPassageSectionHeader';
import { TourSortFilterSheet } from '../components/TourSortFilterSheet';
import { TourStopRescheduleSheet } from '../components/TourStopRescheduleSheet';
import { TourSummaryCard } from '../components/TourSummaryCard';
import type { NurseTourStop, TourSortMode } from '../api/nurse-tour.service';
import { shareTourDayCalendar } from '../utils/tour-calendar';

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
  const [manualOrderActive, setManualOrderActive] = useState(false);

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

  const handleExportDayCalendar = useCallback(async () => {
    if (!tour?.stops.length) return;
    setExportingCalendar(true);
    try {
      const ok = await shareTourDayCalendar(date, tour.stops);
      if (ok) showToast('Tournée prête à importer', { type: 'success' });
      else showToast('Partage calendrier indisponible', { type: 'error' });
    } catch {
      showToast('Export calendrier impossible', { type: 'error' });
    } finally {
      setExportingCalendar(false);
    }
  }, [date, showToast, tour?.stops]);

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

  const hasStops = displayStops.length > 0;

  const sortFilterActive = Boolean(
    tour && (tour.plan.sort_mode !== 'smart' || tour.plan.manual_order_locked),
  );

  const listHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        {tour && hasStops ? <TourSummaryCard summary={tour.summary} /> : null}
        {hasStops ? (
          <TourPassageSectionHeader
            sortActive={sortFilterActive}
            onOpenFilter={() => setSortSheetOpen(true)}
          />
        ) : null}
      </View>
    ),
    [hasStops, sortFilterActive, tour, styles.listHeader],
  );

  return (
    <StackChromeScreen
      headerRight={
        hasStops ? (
          <Row align="center">
            <TourCalendarExportAction
              onPress={() => void handleExportDayCalendar()}
              loading={exportingCalendar}
            />
            <TourLocateAction onPress={() => void handleLocate()} loading={locating} />
          </Row>
        ) : (
          <TourLocateAction onPress={() => void handleLocate()} loading={locating} />
        )
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
            data={displayStops}
            keyExtractor={(item) => item.stop_id}
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
            renderItem={({ item: stop, index }) => {
              if (!tour) return null;
              const toggleDone = () => {
                const isDone =
                  stop.visit_status === 'done' ||
                  stop.visit_status === 'skipped' ||
                  stop.status === 'completed';
                void setStatus(stop.stop_id, isDone ? 'todo' : 'done');
              };
              return (
                <PassageSimpleListRow
                  stop={stop}
                  index={index}
                  total={displayStops.length}
                  isNext={stop.stop_id === tour.next_stop_id}
                  onPressName={() => openPassageDetail(stop)}
                  onToggleDone={toggleDone}
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
      flexGrow: 1,
    },
  };
}
