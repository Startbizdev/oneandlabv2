import { useAppColors } from '@/theme/use-app-colors';

import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { useFocusEffect, useRouter } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import {
  H_PADDING,
  ICON_STROKE_WIDTH,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  iconSize,
  AppText,
  useStyles,
  font,
  type Theme,
} from '@/theme';
import { layoutRowCenter } from '@/theme/layout-styles';
import { useToast } from '@/providers/ToastProvider';
import { isManualOrderLockedError, tourOptimizeErrorMessage } from '@oneandlab/shared-api';
import { ApiRequestError } from '@/lib/errors/api-request-error';
import { handleApiError } from '@/lib/errors/handle-api-error';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import { TourDayStrip } from '@/features/tournee-nurse/components/TourDayStrip';
import { TourLoadingSkeleton } from '@/features/tournee-nurse/components/TourLoadingSkeleton';
import { TourLocateAction } from '@/features/tournee-nurse/components/TourLocateAction';
import { TourSortFilterSheet, tourSortModeLabel } from '@/features/tournee-nurse/components/TourSortFilterSheet';
import { TourStopCard } from '@/features/tournee-nurse/components/TourStopCard';
import { todayTourDate } from '@/features/tournee-nurse/hooks/nurse-tour-query';
import { parseNavAppPref } from '@/features/tournee-nurse/utils/tour-navigation';
import type { TourSortMode } from '@/features/tournee-nurse/api/nurse-tour.service';
import { usePreleveurTour } from '@/features/tournee-preleveur/hooks/use-preleveur-tour';
import type { PreleveurTourPayload } from '@/features/tournee-preleveur/api/preleveur-tour.service';
import { PreleveurStopRow } from '../components/PreleveurStopRow';

function tourProgressLabel(summary: PreleveurTourPayload['summary']): string {
  const parts = [
    `${summary.total_stops} arrêt${summary.total_stops > 1 ? 's' : ''}`,
    `${summary.done_stops} terminé${summary.done_stops > 1 ? 's' : ''}`,
  ];
  if (summary.estimated_km > 0) parts.push(`~${summary.estimated_km.toFixed(1)} km`);
  return parts.join(' · ');
}

/** Tournée du préleveur : jour, ordre de passage, prochain arrêt puis liste ordonnée. */
export function TourneeScreen() {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const router = useRouter();
  const { show: showToast } = useToast();
  const [date, setDate] = useState(todayTourDate);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [locating, setLocating] = useState(false);
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
    nextStop,
  } = usePreleveurTour(date);
  const isToday = date === todayTourDate();

  useFocusEffect(
    useCallback(() => {
      void refreshOrigin().then(() => refetch());
    }, [refreshOrigin, refetch]),
  );

  useEffect(() => {
    setManualOrderActive(false);
  }, [date]);

  const stops = tour?.stops ?? [];
  const showManualReorder = Boolean(
    manualOrderActive || tour?.plan.sort_mode === 'manual' || tour?.plan.manual_order_locked,
  );

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
        result.isError ? 'Tournée non actualisée' : 'Position actualisée — ordre recalculé',
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
        handleApiError(e, showToast, 'preleveur-tour-optimize', 'Optimisation impossible', tourOptimizeErrorMessage);
      }
    },
    [optimize, refetch, showToast],
  );

  const handleMove = useCallback(
    async (appointmentId: string, direction: 'up' | 'down') => {
      try {
        await moveStop(appointmentId, direction);
        setManualOrderActive(true);
      } catch {
        showToast('Enregistrement impossible', { type: 'error' });
      }
    },
    [moveStop, showToast],
  );

  const openStop = useCallback(
    (appointmentId: string) => router.push(appointmentDetailHref('/(preleveur)', appointmentId)),
    [router],
  );

  const sortLabel = tour?.plan.sort_mode
    ? tourSortModeLabel(tour.plan.sort_mode as TourSortMode)
    : 'Intelligent';

  const progressLabel = tour ? tourProgressLabel(tour.summary) : null;

  const ListHeader = (
    <View style={styles.listHeader}>
      {progressLabel && stops.length > 0 ? (
        <AppText variant="secondary" style={styles.progress}>
          {progressLabel}
        </AppText>
      ) : null}
      {isToday && tour && nextStop ? (
        <TourStopCard
          stop={nextStop}
          timeLabel={formatAvailabilityDisplayFr(nextStop.availability, nextStop.scheduled_at)}
          navAppPref={parseNavAppPref(tour.plan.nav_app_pref)}
          eyebrow={`Prochain arrêt · ${nextStop.position} sur ${stops.length}`}
          care={
            nextStop.category_name ? (
              <AppText variant="secondary">{nextStop.category_name}</AppText>
            ) : null
          }
          onPress={() => openStop(nextStop.appointment_id)}
        />
      ) : null}
      {stops.length > 0 ? (
        <AppText variant="headline" style={styles.sectionLabel}>
          Arrêts
        </AppText>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container} collapsable={false}>
      <View style={styles.headerZone}>
        <TourDayStrip embedded selectedDate={date} dayCounts={dayCounts} onSelectDate={setDate} />
        <Row gap={spacing[2]} align="center" style={styles.toolbar}>
          <Pressable
            onPress={() => setSortSheetOpen(true)}
            style={styles.toolBtn}
            accessibilityRole="button"
            accessibilityLabel={`Ordre de la tournée : ${sortLabel}`}
          >
            <SlidersHorizontal size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
            <AppText style={styles.toolBtnText}>{sortLabel}</AppText>
          </Pressable>
          <TourLocateAction loading={locating} onPress={() => void handleLocate()} />
        </Row>
      </View>

      {isLoading ? (
        <TourLoadingSkeleton />
      ) : isError && !tour ? (
        <View style={styles.errorWrap}>
          <ErrorState title="Tournée indisponible" error={error} onRetry={() => void refetch()} />
        </View>
      ) : (
        <FlatList
          data={stops}
          keyExtractor={(item) => item.appointment_id}
          renderItem={({ item, index }) => (
            <PreleveurStopRow
              stop={item}
              isNext={item.stop_id === nextStop?.stop_id}
              showReorder={showManualReorder}
              canMoveUp={index > 0}
              canMoveDown={index < stops.length - 1}
              onPress={() => openStop(item.appointment_id)}
              onMoveUp={() => void handleMove(item.appointment_id, 'up')}
              onMoveDown={() => void handleMove(item.appointment_id, 'down')}
            />
          )}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
          }
          ListEmptyComponent={
            <EmptyState title="Aucun arrêt ce jour" illustration="tour" />
          }
        />
      )}

      <TourSortFilterSheet
        visible={sortSheetOpen}
        active={(tour?.plan.sort_mode ?? 'smart') as TourSortMode}
        locked={!!tour?.plan.manual_order_locked}
        onClose={() => setSortSheetOpen(false)}
        onSelect={(mode, force) => void handleOptimize(mode, force)}
        onReset={() => void handleOptimize('smart', true)}
      />
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    headerZone: {
      backgroundColor: c.surface,
      paddingHorizontal: H_PADDING,
      paddingTop: spacing[2],
      paddingBottom: spacing[2],
      gap: spacing[2],
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderLight,
    },
    toolbar: { flexWrap: 'wrap' as const },
    toolBtn: {
      ...layoutRowCenter(spacing[2]),
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: spacing[3],
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    toolBtnText: {
      ...font.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    listHeader: { paddingTop: spacing[3], gap: spacing[3] },
    progress: { paddingHorizontal: spacing[1] },
    sectionLabel: {
      paddingHorizontal: spacing[1],
      marginTop: spacing[1],
      marginBottom: spacing[1],
    },
    list: {
      minWidth: 0,
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[10],
      flexGrow: 1,
    },
    separator: { height: spacing[2] },
    errorWrap: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center' as const,
      paddingHorizontal: H_PADDING,
    },
  };
}
