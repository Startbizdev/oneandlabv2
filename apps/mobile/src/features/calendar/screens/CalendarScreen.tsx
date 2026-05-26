import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react-native';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import type { Appointment, AppointmentListFilters, AppointmentType } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { fetchAppointments } from '@/features/appointments/api/appointments.service';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import {
  appointmentCalendarDayKey,
  appointmentInCalendarMonth,
} from '@/utils/appointment-calendar-day-key';
import { CalendarFilterSheet } from '@/features/calendar/components/CalendarFilterSheet';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { DayAppointmentsSheet } from '@/components/ui/DayAppointmentsSheet';
import { EMPTY_RDV_IMAGE, EMPTY_RDV_IMAGE_HEIGHT, EMPTY_RDV_IMAGE_WIDTH } from '@/constants/empty-state-images';
import {
  CALENDAR_STATUS_OPTIONS,
  CALENDAR_TYPE_OPTIONS,
  type CalendarStatusFilter,
  type CalendarTypeFilter,
} from '@/constants/calendar-filters';
import { NURSE_TAB_OPTIONS, type NurseListTab } from '@/constants/appointments-list-filters';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Aligné web `CalendarPage.vue` — inclut les RDV en attente. */
const NURSE_CALENDAR_STATUSES =
  'pending,confirmed,inProgress,completed,canceled,refused';

interface Props {
  title: string;
  baseFilters?: AppointmentListFilters;
  detailPathPrefix: string;
  /** Calendrier infirmier : Mes soins / Bilans + filtres avancés */
  nurseCalendar?: boolean;
  /** Cartes liste RDV (même rendu que l’onglet Rendez-vous). */
  listRole?: 'nurse' | 'pro' | 'preleveur';
}

function listRoleFromDetailPrefix(prefix: string): 'nurse' | 'pro' | 'preleveur' {
  if (prefix.includes('nurse')) return 'nurse';
  if (prefix.includes('preleveur')) return 'preleveur';
  return 'pro';
}

function monthMatrix(year: number, month: number) {
  const start = dayjs().year(year).month(month).startOf('month');
  const end = start.endOf('month');
  const startWd = (start.day() + 6) % 7;
  const cells: Array<dayjs.Dayjs | null> = [];
  for (let i = 0; i < startWd; i++) cells.push(null);
  let d = start;
  while (d.isBefore(end) || d.isSame(end, 'day')) {
    cells.push(d);
    d = d.add(1, 'day');
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function CalendarScreen({
  baseFilters,
  detailPathPrefix,
  nurseCalendar = false,
  listRole: listRoleProp,
}: Props) {
  const listRole = listRoleProp ?? listRoleFromDetailPrefix(detailPathPrefix);
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [cursor, setCursor] = useState(dayjs());
  const [selectedDay, setSelectedDay] = useState(dayjs().format('YYYY-MM-DD'));
  const [nurseTab, setNurseTab] = useState<NurseListTab>('soins');
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>('');
  const [typeFilter, setTypeFilter] = useState<CalendarTypeFilter>('');
  const [search, setSearch] = useState('');
  const rangeFrom = cursor.startOf('month').format('YYYY-MM-DD');
  const rangeTo = cursor.endOf('month').format('YYYY-MM-DD');
  const apiStatus = nurseCalendar
    ? statusFilter || NURSE_CALENDAR_STATUSES
    : statusFilter || undefined;
  const calendarLimit = nurseCalendar ? 50 : 200;

  const listQ = useQuery({
    queryKey: queryKeys.appointments.list({
      ...baseFilters,
      ...(nurseCalendar ? { nurse_tab: nurseTab, status: apiStatus } : {}),
      ...(nurseCalendar ? {} : { date_from: rangeFrom, date_to: rangeTo }),
      limit: calendarLimit,
      status: apiStatus,
      type: (typeFilter || undefined) as AppointmentType | undefined,
    }),
    queryFn: async () => {
      const res = await fetchAppointments({
        ...baseFilters,
        ...(nurseCalendar ? { nurse_tab: nurseTab } : {}),
        ...(nurseCalendar ? {} : { date_from: rangeFrom, date_to: rangeTo }),
        limit: calendarLimit,
        ...(apiStatus ? { status: apiStatus } : {}),
        ...(typeFilter ? { type: typeFilter as AppointmentType } : {}),
      });
      let items = res.data ?? [];
      if (nurseCalendar) {
        items = items.filter((a) => appointmentInCalendarMonth(a, rangeFrom, rangeTo));
      }
      return items;
    },
  });

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of listQ.data ?? []) {
      const key = appointmentCalendarDayKey(a);
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [listQ.data]);

  const dayItems = useMemo(() => {
    let items = byDay.get(selectedDay) ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((a) => {
        const fd = a.form_data as Record<string, unknown> | undefined;
        const name = `${fd?.first_name ?? ''} ${fd?.last_name ?? ''}`.toLowerCase();
        return name.includes(q) || (a.category_name ?? '').toLowerCase().includes(q);
      });
    }
    return items;
  }, [byDay, selectedDay, search]);

  const dayDisplayRows = useMemo(
    () => buildAppointmentDisplayRows(dayItems, { direction: 'upcoming' }),
    [dayItems],
  );

  const cells = useMemo(() => monthMatrix(cursor.year(), cursor.month()), [cursor]);
  const today = dayjs().format('YYYY-MM-DD');
  const cellSize = Math.floor((width - spacing[4] * 2 - spacing[1] * 6) / 7);

  const filterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (nurseCalendar && nurseTab !== 'soins') {
      const tabLabel = NURSE_TAB_OPTIONS.find((t) => t.value === nurseTab)?.label ?? nurseTab;
      chips.push({ key: 'tab', label: tabLabel, onRemove: () => setNurseTab('soins') });
    }
    if (statusFilter) {
      const label = CALENDAR_STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label ?? statusFilter;
      chips.push({ key: 'status', label, onRemove: () => setStatusFilter('') });
    }
    if (typeFilter) {
      const label = CALENDAR_TYPE_OPTIONS.find((t) => t.value === typeFilter)?.label ?? typeFilter;
      chips.push({ key: 'type', label, onRemove: () => setTypeFilter('') });
    }
    return chips;
  }, [nurseCalendar, nurseTab, statusFilter, typeFilter]);

  const advancedCount =
    (nurseCalendar && nurseTab !== 'soins' ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (typeFilter ? 1 : 0);

  const goPrevMonth = useCallback(() => {
    setCursor((c) => c.subtract(1, 'month'));
  }, []);

  const goNextMonth = useCallback(() => {
    setCursor((c) => c.add(1, 'month'));
  }, []);

  const monthSwipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-18, 18])
        .onEnd((e) => {
          if (e.translationX < -48) {
            runOnJS(goNextMonth)();
          } else if (e.translationX > 48) {
            runOnJS(goPrevMonth)();
          }
        }),
    [goNextMonth, goPrevMonth],
  );

  const openDaySheet = useCallback((dayKey: string) => {
    setSelectedDay(dayKey);
    setSheetOpen(true);
  }, []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const renderDayItem = useCallback(
    (row: AppointmentListRow, index: number) => (
      <AppointmentListRowCard
        row={row}
        index={index}
        role={listRole}
        onPress={(apt) => {
          closeSheet();
          router.push(`${detailPathPrefix}/${apt.id}` as never);
        }}
      />
    ),
    [router, detailPathPrefix, closeSheet, listRole],
  );

  const dayRowKey = useCallback(
    (row: AppointmentListRow) => (row.kind === 'batch' ? row.key : row.appointment.id),
    [],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(280).springify()}>
          <AppointmentsListFilterBar
            embedded
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Patient, soin…"
            onOpenFilters={() => setFilterSheetOpen(true)}
            advancedFilterCount={advancedCount}
            chips={filterChips}
          />
        </Animated.View>

        <GestureDetector gesture={monthSwipeGesture}>
          <Animated.View style={styles.calendarSwipeArea}>
            <Animated.View
              entering={FadeInDown.delay(40).duration(280).springify()}
              style={[styles.monthNav, elevation.xs]}
            >
              <Pressable onPress={goPrevMonth} style={styles.navBtn} hitSlop={8}>
                <ChevronLeft size={18} color={colors.primary} strokeWidth={2.5} />
              </Pressable>
              <Text style={styles.monthLabel}>{cursor.format('MMMM YYYY')}</Text>
              <Pressable onPress={goNextMonth} style={styles.navBtn} hitSlop={8}>
                <ChevronRight size={18} color={colors.primary} strokeWidth={2.5} />
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(60).duration(280).springify()} style={styles.weekRow}>
              {WEEKDAYS.map((d, i) => (
                <View key={i} style={[styles.weekCell, { width: cellSize }]}>
                  <Text style={styles.weekLabel}>{d}</Text>
                </View>
              ))}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100).duration(280).springify()} style={styles.grid}>
              {cells.map((day, idx) => {
                if (!day) {
                  return <View key={`empty-${idx}`} style={{ width: cellSize, height: cellSize + 8 }} />;
                }
                const key = day.format('YYYY-MM-DD');
                const count = byDay.get(key)?.length ?? 0;
                const isSelected = key === selectedDay;
                const isToday = key === today;
                return (
                  <Pressable
                    key={key}
                    onPress={() => openDaySheet(key)}
                    style={[
                      styles.dayCell,
                      { width: cellSize, height: cellSize + 8 },
                      isSelected && styles.dayCellSelected,
                      !isSelected && isToday && styles.dayCellToday,
                      !isSelected && count > 0 && styles.dayCellHasEvents,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        isSelected && styles.dayNumSelected,
                        !isSelected && isToday && styles.dayNumToday,
                      ]}
                    >
                      {day.format('D')}
                    </Text>
                    {count > 0 ? (
                      <View style={styles.dotRow}>
                        {Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                          <View key={di} style={[styles.dot, isSelected && styles.dotWhite]} />
                        ))}
                      </View>
                    ) : (
                      <View style={styles.dotPlaceholder} />
                    )}
                  </Pressable>
                );
              })}
            </Animated.View>
          </Animated.View>
        </GestureDetector>

        <Animated.View entering={FadeInDown.delay(160).duration(280).springify()}>
          <Pressable onPress={() => openDaySheet(selectedDay)} style={styles.daySummary}>
            <Calendar size={15} color={colors.primary} strokeWidth={2} />
            <Text style={styles.daySummaryText} numberOfLines={1}>
              {dayjs(selectedDay).format('dddd D MMMM')} · {dayItems.length} RDV
            </Text>
            <ChevronRight size={15} color={colors.primary} strokeWidth={2.5} />
          </Pressable>
        </Animated.View>
      </ScrollView>

      <DayAppointmentsSheet
        visible={sheetOpen}
        title={dayjs(selectedDay).format('dddd D MMMM YYYY')}
        subtitle={`${dayDisplayRows.length} rendez-vous`}
        data={dayDisplayRows}
        keyExtractor={dayRowKey}
        renderItem={renderDayItem}
        onClose={closeSheet}
        empty={
          <EmptyState
            title="Aucun rendez-vous"
            imageSource={EMPTY_RDV_IMAGE}
            imageWidth={EMPTY_RDV_IMAGE_WIDTH}
            imageHeight={EMPTY_RDV_IMAGE_HEIGHT}
          />
        }
      />

      <CalendarFilterSheet
        visible={filterSheetOpen}
        onClose={() => setFilterSheetOpen(false)}
        status={statusFilter}
        type={typeFilter}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        nurseCalendar={nurseCalendar}
        nurseTab={nurseTab}
        onNurseTabChange={setNurseTab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[10],
    gap: spacing[3],
  },
  calendarSwipeArea: {
    gap: spacing[3],
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    letterSpacing: -0.3,
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  weekCell: { alignItems: 'center', paddingBottom: spacing[1] },
  weekLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  dayCell: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayCellToday: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  dayCellHasEvents: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryMid,
  },
  dayNum: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
  },
  dayNumSelected: { color: colors.textInverse },
  dayNumToday: { color: colors.primary },
  dotRow: { flexDirection: 'row', gap: 2 },
  dotPlaceholder: { height: 4 },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  dotWhite: { backgroundColor: 'rgba(255,255,255,0.75)' },
  daySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  daySummaryText: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.primary,
    textTransform: 'capitalize',
  },
});
