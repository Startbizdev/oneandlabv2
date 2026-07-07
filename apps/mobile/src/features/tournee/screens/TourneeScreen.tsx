import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Cluster, Row } from '@/components/layout/primitives';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { EMPTY_RDV_IMAGE, EMPTY_RDV_IMAGE_HEIGHT, EMPTY_RDV_IMAGE_WIDTH } from '@/constants/empty-state-images';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { elevation, radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { layoutRowCenter } from '@/theme/layout-styles';
import { useToast } from '@/providers/ToastProvider';
import { TourLocateAction } from '@/features/tournee-nurse/components/TourLocateAction';
import { TourSortFilterSheet, tourSortModeLabel } from '@/features/tournee-nurse/components/TourSortFilterSheet';
import { TourStopRouteChip } from '@/features/tournee-nurse/components/TourStopRouteChip';
import type { TourSortMode } from '@/features/tournee-nurse/api/nurse-tour.service';
import type { PreleveurTourStop } from '@/features/tournee-preleveur/api/preleveur-tour.service';
import { usePreleveurTour } from '@/features/tournee-preleveur/hooks/use-preleveur-tour';

const OFFSET_MIN = -90;
const OFFSET_MAX = 90;

interface StopCardProps {
  stop: PreleveurTourStop;
  showReorder: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPress: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

const StopCard = React.memo(function StopCard({
  stop,
  showReorder,
  canMoveUp,
  canMoveDown,
  onPress,
  onMoveUp,
  onMoveDown,
}: StopCardProps) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'TourneeScreen.StopCard');
  const timeLabel = formatAvailabilityDisplayFr(stop.availability, stop.scheduled_at);

  return (
    <Pressable onPress={onPress} style={[styles.stopCardShell, elevation.md]}>
      <View style={styles.stopCard}>
        <Row justify="between" align="start" gap={spacing[2]}>
          <Cluster
            gap={spacing[3]}
            style={{ flex: 1, minWidth: 0 }}
            leading={
              <View style={styles.stopIndex}>
                <AppText style={styles.stopIndexText}>{stop.position}</AppText>
              </View>
            }
            actions={<StatusBadge status={stop.status} />}
          >
            <View style={styles.stopInfo}>
              <AppText style={styles.stopName}>{stop.patient_name}</AppText>
              <Row wrap gap={spacing[1]} align="center">
                <Clock size={iconSize['2xs']} color={c.primary} strokeWidth={2} />
                <AppText style={styles.stopTime}>{timeLabel || '—'}</AppText>
                {stop.address_line ? (
                  <>
                    <View style={styles.metaDot} />
                    <MapPin size={iconSize['2xs']} color={c.textTertiary} strokeWidth={2} />
                    <AppText style={styles.stopAddress} numberOfLines={1}>
                      {stop.address_line}
                    </AppText>
                  </>
                ) : null}
              </Row>
            </View>
          </Cluster>
          {showReorder ? (
            <View style={styles.reorderCol}>
              <Pressable
                onPress={onMoveUp}
                disabled={!canMoveUp}
                style={[styles.reorderBtn, !canMoveUp && styles.reorderBtnDisabled]}
                hitSlop={8}
              >
                <ChevronUp size={iconSize.mdSm} color={canMoveUp ? c.primary : c.textTertiary} />
              </Pressable>
              <Pressable
                onPress={onMoveDown}
                disabled={!canMoveDown}
                style={[styles.reorderBtn, !canMoveDown && styles.reorderBtnDisabled]}
                hitSlop={8}
              >
                <ChevronDown size={iconSize.mdSm} color={canMoveDown ? c.primary : c.textTertiary} />
              </Pressable>
            </View>
          ) : null}
        </Row>
        {stop.position > 1 ? (
          <View style={styles.routeRow}>
            <TourStopRouteChip stop={stop} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

export function TourneeScreen() {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_tournee_screens_TourneeScreen_tsx_styles');
  const router = useRouter();
  const { show: showToast } = useToast();
  const [dayOffset, setDayOffset] = useState(0);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [manualOrderActive, setManualOrderActive] = useState(false);

  const date = useMemo(
    () => dayjs().add(dayOffset, 'day').format('YYYY-MM-DD'),
    [dayOffset],
  );

  const { tour, isLoading, isFetching, refetch, refreshCoords, moveStop, optimize } =
    usePreleveurTour(date);

  useFocusEffect(
    useCallback(() => {
      void refreshCoords();
      void refetch();
    }, [refreshCoords, refetch]),
  );

  useEffect(() => {
    setManualOrderActive(false);
  }, [date]);

  const stops = tour?.stops ?? [];
  const showManualReorder = Boolean(
    manualOrderActive || tour?.plan.sort_mode === 'manual' || tour?.plan.manual_order_locked,
  );

  const shiftDay = useCallback((d: number) => {
    setDayOffset((o) => {
      const next = o + d;
      if (next < OFFSET_MIN || next > OFFSET_MAX) return o;
      return next;
    });
  }, []);

  const handleLocate = useCallback(async () => {
    setLocating(true);
    try {
      await refreshCoords();
      await refetch();
      showToast('Position actualisée — ordre recalculé', { type: 'success' });
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

  const dayLabel = dayjs().add(dayOffset, 'day');
  const isToday = dayOffset === 0;
  const sortLabel = tour?.plan.sort_mode
    ? tourSortModeLabel(tour.plan.sort_mode as TourSortMode)
    : 'Intelligent';

  const ListHeader = (
    <View style={styles.headerBlock}>
      <Row justify="between" align="center" style={[styles.dateNav, elevation.xs]}>
        <Pressable
          onPress={() => shiftDay(-1)}
          disabled={dayOffset <= OFFSET_MIN}
          style={[styles.navBtn, dayOffset <= OFFSET_MIN && styles.navBtnDisabled]}
          hitSlop={12}
        >
          <ChevronLeft size={iconSize.md} color={dayOffset <= OFFSET_MIN ? c.textTertiary : c.primary} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.dateCenter}>
          {isToday ? <AppText style={styles.todayBadge}>Aujourd'hui</AppText> : null}
          <AppText style={styles.dateLabel}>{dayLabel.format('dddd D MMMM YYYY')}</AppText>
          {stops.length > 0 ? (
            <AppText style={styles.stopCount}>
              {stops.length} arrêt{stops.length > 1 ? 's' : ''}
              {tour?.summary.estimated_km
                ? ` · ~${tour.summary.estimated_km.toFixed(1)} km`
                : ''}
            </AppText>
          ) : null}
        </View>
        <Pressable
          onPress={() => shiftDay(1)}
          disabled={dayOffset >= OFFSET_MAX}
          style={[styles.navBtn, dayOffset >= OFFSET_MAX && styles.navBtnDisabled]}
          hitSlop={12}
        >
          <ChevronRight size={iconSize.md} color={dayOffset >= OFFSET_MAX ? c.textTertiary : c.primary} strokeWidth={2.5} />
        </Pressable>
      </Row>

      <Row gap={spacing[2]} style={styles.toolbar}>
        <Pressable
          onPress={() => setSortSheetOpen(true)}
          style={[styles.toolBtn, elevation.xs]}
        >
          <SlidersHorizontal size={iconSize.sm} color={c.primary} strokeWidth={2} />
          <AppText style={styles.toolBtnText}>{sortLabel}</AppText>
        </Pressable>
        <TourLocateAction loading={locating} onPress={() => void handleLocate()} />
      </Row>
    </View>
  );

  if (isLoading && !tour) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator color={c.primary} />
        <AppText style={styles.loadingText}>Chargement de la tournée…</AppText>
      </View>
    );
  }

  return (
    <View style={styles.container} collapsable={false}>
      <FlatList
        data={stops}
        keyExtractor={(item) => item.appointment_id}
        renderItem={({ item, index }) => (
          <StopCard
            stop={item}
            showReorder={showManualReorder}
            canMoveUp={index > 0}
            canMoveDown={index < stops.length - 1}
            onPress={() => router.push(`/(preleveur)/appointment/${item.appointment_id}`)}
            onMoveUp={() => void moveStop(item.appointment_id, 'up')}
            onMoveDown={() => void moveStop(item.appointment_id, 'down')}
          />
        )}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={() => void refetch()} />
        }
        ListEmptyComponent={
          <EmptyState
            title="Aucun arrêt prévu"
            description="Aucun prélèvement assigné pour cette date."
            imageSource={EMPTY_RDV_IMAGE}
            imageWidth={EMPTY_RDV_IMAGE_WIDTH}
            imageHeight={EMPTY_RDV_IMAGE_HEIGHT}
          />
        }
      />

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

function buildStyles(c: AppColors) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    centered: { alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing[3] },
    loadingText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textTertiary,
    },
    headerBlock: { gap: spacing[2], marginBottom: spacing[2] },
    dateNav: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[3],
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: c.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    navBtnDisabled: { backgroundColor: c.surfaceAlt },
    dateCenter: { minWidth: 0, alignItems: 'center' as const, gap: 2, flex: 1 },
    todayBadge: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.xs,
      color: c.primary,
      letterSpacing: 0.8,
      textTransform: 'uppercase' as const,
    },
    dateLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
      textTransform: 'capitalize' as const,
      textAlign: 'center' as const,
    },
    stopCount: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
    },
    toolbar: { flexWrap: 'wrap' as const },
    toolBtn: {
      ...layoutRowCenter(spacing[2]),
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.lg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    toolBtnText: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    list: {
      minWidth: 0,
      paddingHorizontal: spacing[4],
      paddingBottom: spacing[10],
      flexGrow: 1,
    },
    stopCardShell: { borderRadius: radius.xl },
    stopCard: {
      backgroundColor: c.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing[4],
      gap: spacing[2],
    },
    stopIndex: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: c.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    stopIndexText: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.base,
      color: c.primary,
    },
    stopInfo: { gap: spacing[1], flex: 1, minWidth: 0 },
    stopName: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    stopTime: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      color: c.primary,
    },
    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: c.textTertiary,
    },
    stopAddress: {
      minWidth: 0,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      color: c.textTertiary,
      flex: 1,
    },
    reorderCol: { gap: spacing[1] },
    reorderBtn: {
      width: 32,
      height: 28,
      borderRadius: radius.sm,
      backgroundColor: c.surfaceAlt,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    reorderBtnDisabled: { opacity: 0.4 },
    routeRow: { alignItems: 'flex-end' as const },
  };
}
