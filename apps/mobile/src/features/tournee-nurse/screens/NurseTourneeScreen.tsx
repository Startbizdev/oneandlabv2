import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { Row } from '@/components/layout/primitives';
import { StackChromeScreen } from '@/navigation/StackChromeScreen';
import { useStackContentTopInset } from '@/navigation/use-stack-scroll-config';
import { H_PADDING, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { useToast } from '@/providers/ToastProvider';
import { useNurseTour } from '../hooks/use-nurse-tour';
import { TourCalendarExportAction } from '../components/TourCalendarExportAction';
import { TourDayStrip } from '../components/TourDayStrip';
import { TourEmptyPanel } from '../components/TourEmptyPanel';
import { TourLoadingSkeleton } from '../components/TourLoadingSkeleton';
import { TourLocateAction } from '../components/TourLocateAction';
import { TourMockBanner } from '../components/TourMockBanner';
import { TourSortModeChips } from '../components/TourSortModeChips';
import { TourStopCard } from '../components/TourStopCard';
import { TourStopRescheduleSheet } from '../components/TourStopRescheduleSheet';
import { TourSummaryCard } from '../components/TourSummaryCard';
import type { NurseTourStop, TourSortMode } from '../api/nurse-tour.service';
import { isMockTourId } from '../utils/tour-mock-data';
import { shareTourDayCalendar, shareTourStopCalendarEvent } from '../utils/tour-calendar';

export function NurseTourneeScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const router = useRouter();
  const { show: showToast } = useToast();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [locating, setLocating] = useState(false);
  const [exportingCalendar, setExportingCalendar] = useState(false);
  const [rescheduleStop, setRescheduleStop] = useState<NurseTourStop | null>(null);

  const contentTopInset = useStackContentTopInset();
  const sceneInsets = useTabSceneInsets();
  const listScrollConfig = buildTabSceneScrollConfig(
    { insetTop: 0, insetBottom: sceneInsets.insetBottom },
    styles.list,
    { extraTop: spacing[2] },
  );

  const {
    tour,
    isLoading,
    isFetching,
    isMockActive,
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

  const handleLocate = useCallback(async () => {
    setLocating(true);
    try {
      await refreshCoords();
      showToast('Position actualisée', { type: 'success' });
    } catch {
      showToast('GPS indisponible', { type: 'error' });
    } finally {
      setLocating(false);
    }
  }, [refreshCoords, showToast]);

  const handleOptimize = useCallback(
    async (mode: TourSortMode, force?: boolean) => {
      try {
        await optimize(mode, force);
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
        showToast('Ordre enregistré', { type: 'success' });
      } catch {
        showToast('Enregistrement impossible', { type: 'error' });
      }
    },
    [moveStop, showToast],
  );

  const openStopDetail = useCallback(
    (stop: NurseTourStop) => {
      if (isMockActive || isMockTourId(stop.appointment_id)) {
        showToast('Aperçu dev — détail disponible sur un RDV réel', { type: 'info' });
        return;
      }
      router.push(`/(nurse)/appointment/${stop.appointment_id}` as never);
    },
    [isMockActive, router, showToast],
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

  const handleAddStopToCalendar = useCallback(
    async (stop: NurseTourStop) => {
      try {
        const ok = await shareTourStopCalendarEvent(stop);
        if (ok) showToast('Passage prêt à importer', { type: 'success' });
        else showToast('Partage calendrier indisponible', { type: 'error' });
      } catch {
        showToast('Ajout calendrier impossible', { type: 'error' });
      }
    },
    [showToast],
  );

  const hasStops = (tour?.stops.length ?? 0) > 0;

  const listHeader = (
    <>
      {tour && hasStops ? <TourSummaryCard summary={tour.summary} /> : null}
      {tour && hasStops ? (
        <TourSortModeChips
          active={tour.plan.sort_mode}
          locked={tour.plan.manual_order_locked}
          onSelect={handleOptimize}
          onReset={() => void resetOrder()}
        />
      ) : null}
      {hasStops ? (
        <Text style={[styles.sectionTitle, { color: c.textTertiary }]}>Vos passages</Text>
      ) : null}
    </>
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
          {isMockActive ? <TourMockBanner embedded /> : null}
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
            data={tour?.stops ?? []}
            keyExtractor={(item) => item.stop_id}
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
            renderItem={({ item: stop, index }) =>
              tour ? (
                <TourStopCard
                  stop={stop}
                  index={index}
                  total={tour.stops.length}
                  isNext={stop.stop_id === tour.next_stop_id}
                  onPress={() => openStopDetail(stop)}
                  onMoveUp={() => void handleMove(stop.appointment_id, 'up')}
                  onMoveDown={() => void handleMove(stop.appointment_id, 'down')}
                  onMarkDone={() => void setStatus(stop.stop_id, 'done')}
                  onAddToCalendar={() => void handleAddStopToCalendar(stop)}
                  onReschedule={() => setRescheduleStop(stop)}
                />
              ) : null
            }
          />
        )}
      </View>

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
    listEmpty: {
      flexGrow: 1,
    },
    sectionTitle: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.6,
      marginBottom: spacing[2],
    },
  };
}
