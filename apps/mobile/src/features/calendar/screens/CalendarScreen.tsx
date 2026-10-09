import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import dayjs from 'dayjs';
import { appointmentDayFrance, calendarDayKeyFromParts } from '@oneandlab/shared-utils';
import { useQuery } from '@tanstack/react-query';
import type { Appointment, AppointmentListFilters, AppointmentType } from '@oneandlab/shared-types';
import { queryKeys } from '@/lib/query-keys';
import { fetchCalendarAppointments } from '@/features/appointments/api/appointments.service';
import { AppointmentListRowCard } from '@/features/appointments/components/AppointmentListRowCard';
import { buildAppointmentDisplayRows } from '@/utils/appointment-list-sort';
import { appointmentCalendarDayKey } from '@/utils/appointment-calendar-day-key';
import { capitalizeFrench } from '@/utils/appointment-datetime-fr';
import { CalendarFilterSheet } from '@/features/calendar/components/CalendarFilterSheet';
import { AppointmentsListFilterBar } from '@/features/appointments/components/AppointmentsListFilterBar';
import { useScreenFabScrollClearance } from '@/components/ui/ScreenFab';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconActionButton } from '@/components/ui/IconActionButton';
import { useManualRefresh } from '@/lib/hooks/use-manual-refresh';
import { appointmentDetailHref } from '@/navigation/role-hrefs';
import type { RoleRoutePrefix } from '@/navigation/role-route-prefix';
import {
  CALENDAR_STATUS_OPTIONS,
  CALENDAR_TYPE_OPTIONS,
  type CalendarStatusFilter,
  type CalendarTypeFilter,
} from '@/constants/calendar-filters';
import { NURSE_TAB_OPTIONS, type NurseListTab } from '@/constants/appointments-list-filters';
import {
  ICON_STROKE_WIDTH,
  radius,
  spacing,
  iconSize,
  gridCellSize,
  useLayoutMetrics,
  AppText,
  useStyles,
  font,
  type Theme,
} from '@/theme';

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DOT_SIZE = spacing[1];

/** Aligné web `CalendarPage.vue` — inclut les RDV en attente. */
const NURSE_CALENDAR_STATUSES = 'pending,confirmed,inProgress,completed,canceled,refused';

interface Props {
  /** Nom accessible de l'écran (lecteur d'écran). */
  title: string;
  baseFilters?: AppointmentListFilters;
  rolePrefix: CalendarRolePrefix;
  /** Calendrier infirmier : Mes soins / Bilans + filtres avancés */
  nurseCalendar?: boolean;
}

type CalendarRolePrefix = Exclude<RoleRoutePrefix, '/(patient)'>;

/** Cartes liste RDV (même rendu que l'onglet Rendez-vous). */
function listRoleFromPrefix(prefix: CalendarRolePrefix): 'nurse' | 'pro' | 'preleveur' {
  switch (prefix) {
    case '/(nurse)':
      return 'nurse';
    case '/(pro)':
      return 'pro';
    case '/(preleveur)':
      return 'preleveur';
  }
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

/** Calendrier mensuel : taper un jour affiche ses rendez-vous juste en dessous. */
export function CalendarScreen({
  title,
  baseFilters,
  rolePrefix,
  nurseCalendar = false,
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const listRole = listRoleFromPrefix(rolePrefix);
  const layout = useLayoutMetrics();
  const router = useRouter();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [cursor, setCursor] = useState(dayjs());
  const [selectedDay, setSelectedDay] = useState(dayjs().format('YYYY-MM-DD'));
  const [nurseTab, setNurseTab] = useState<NurseListTab>('soins');
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>('');
  const [typeFilter, setTypeFilter] = useState<CalendarTypeFilter>('');
  const [search, setSearch] = useState('');
  const rangeFrom = cursor.startOf('month').format('YYYY-MM-DD');
  const rangeTo = cursor.endOf('month').format('YYYY-MM-DD');
  const apiStatus = nurseCalendar ? statusFilter || NURSE_CALENDAR_STATUSES : statusFilter || undefined;
  const calendarFilters: AppointmentListFilters = {
    ...baseFilters,
    ...(nurseCalendar ? { nurse_tab: nurseTab } : {}),
    date_from: `${rangeFrom} 00:00:00`,
    date_to: `${rangeTo} 23:59:59`,
    ...(apiStatus ? { status: apiStatus } : {}),
    ...(typeFilter ? { type: typeFilter as AppointmentType } : {}),
  };
  const listQ = useQuery({
    queryKey: queryKeys.appointments.calendar(calendarFilters),
    queryFn: () => fetchCalendarAppointments(calendarFilters),
  });

  const { refreshing, onRefresh } = useManualRefresh(listQ.refetch);

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of listQ.data ?? []) {
      const key = appointmentCalendarDayKey(a);
      if (!key) continue;
      const bucket = map.get(key);
      if (bucket) bucket.push(a);
      else map.set(key, [a]);
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
  const today = appointmentDayFrance(new Date());
  const cellSize = gridCellSize(layout.width, 7, spacing[1], spacing[4]);

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
    (nurseCalendar && nurseTab !== 'soins' ? 1 : 0) + (statusFilter ? 1 : 0) + (typeFilter ? 1 : 0);

  const shiftMonth = useCallback(
    (delta: 1 | -1) => {
      setCursor((prev) => {
        const next = prev.add(delta, 'month');
        if (!selectedDay.startsWith(next.format('YYYY-MM'))) {
          setSelectedDay(next.format('YYYY-MM-DD'));
        }
        return next;
      });
    },
    [selectedDay],
  );
  const goPrevMonth = useCallback(() => shiftMonth(-1), [shiftMonth]);
  const goNextMonth = useCallback(() => shiftMonth(1), [shiftMonth]);

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

  const fabClearance = useScreenFabScrollClearance();
  const selectedLabel = capitalizeFrench(dayjs(selectedDay).format('dddd D MMMM'));
  const countLabel =
    dayDisplayRows.length === 0
      ? null
      : `${dayDisplayRows.length} rendez-vous`;

  return (
    <View style={styles.container} accessibilityLabel={title}>
      <View style={styles.filterHost}>
        <AppointmentsListFilterBar
          embedded
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={nurseCalendar ? 'Nom, téléphone, adresse…' : 'Patient, soin…'}
          onOpenFilters={() => setFilterSheetOpen(true)}
          advancedFilterCount={advancedCount}
          chips={filterChips}
        />
      </View>
      <ScrollView
        style={styles.scroll}
        collapsable={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={Platform.OS === 'android'}
        contentContainerStyle={[
          styles.content,
          nurseCalendar ? { paddingBottom: spacing[4] + fabClearance } : null,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        <GestureDetector gesture={monthSwipeGesture}>
          <View style={styles.calendarSwipeArea}>
            <Row justify="between" align="center">
              <IconActionButton label="Mois précédent" onPress={goPrevMonth}>
                <ChevronLeft size={iconSize.md} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              </IconActionButton>
              <AppText variant="headline" style={styles.monthLabel} accessibilityRole="header">
                {capitalizeFrench(cursor.format('MMMM YYYY'))}
              </AppText>
              <IconActionButton label="Mois suivant" onPress={goNextMonth}>
                <ChevronRight size={iconSize.md} color={c.textPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              </IconActionButton>
            </Row>

            <Row gap={spacing[1]}>
              {WEEKDAYS.map((d, i) => (
                <View key={i} style={[styles.weekCell, { width: cellSize }]}>
                  <AppText variant="caption" compact style={styles.weekLabel}>
                    {d}
                  </AppText>
                </View>
              ))}
            </Row>

            <Row wrap gap={spacing[1]}>
              {cells.map((day, idx) => {
                if (!day) {
                  return <View key={`empty-${idx}`} style={{ width: cellSize, height: cellSize }} />;
                }
                const key = calendarDayKeyFromParts(day.year(), day.month() + 1, day.date());
                const count = byDay.get(key)?.length ?? 0;
                const isSelected = key === selectedDay;
                const isToday = key === today;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedDay(key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${day.format('dddd D MMMM')}${count > 0 ? `, ${count} rendez-vous` : ''}`}
                    style={[styles.dayCell, { width: cellSize, height: cellSize }]}
                  >
                    <View
                      style={[
                        styles.dayDisc,
                        isSelected && styles.dayDiscSelected,
                        !isSelected && isToday && styles.dayDiscToday,
                      ]}
                    >
                      <AppText
                        compact
                        style={[
                          styles.dayNum,
                          isSelected && styles.dayNumSelected,
                          !isSelected && isToday && styles.dayNumToday,
                        ]}
                      >
                        {day.format('D')}
                      </AppText>
                    </View>
                    <View style={[styles.dot, count > 0 && !isSelected ? styles.dotVisible : null]} />
                  </Pressable>
                );
              })}
            </Row>
          </View>
        </GestureDetector>

        <View style={styles.dayHeader}>
          <AppText variant="headline">
            {selectedLabel}
          </AppText>
          {countLabel && !listQ.isPending && !listQ.isError ? (
            <AppText variant="secondary">{countLabel}</AppText>
          ) : null}
          {!listQ.isPending && !listQ.isError && dayDisplayRows.length === 0 ? (
            <AppText variant="secondary">Aucun rendez-vous ce jour</AppText>
          ) : null}
        </View>

        {listQ.isPending ? (
          <ActivityIndicator color={c.primary} accessibilityLabel="Chargement du calendrier" />
        ) : listQ.isError ? (
          <ErrorState
            error={listQ.error}
            title="Calendrier indisponible"
            onRetry={() => {
              void listQ.refetch();
            }}
          />
        ) : dayDisplayRows.length === 0 ? null : (
          <View style={styles.dayList}>
            {dayDisplayRows.map((row, index) => (
              <AppointmentListRowCard
                key={row.kind === 'batch' ? row.key : row.appointment.id}
                row={row}
                index={index}
                role={listRole}
                onPress={(apt) => {
                  router.push(appointmentDetailHref(rolePrefix, apt.id));
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

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

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    container: { minWidth: 0, flex: 1, backgroundColor: c.background },
    filterHost: {
      alignSelf: 'stretch' as const,
      width: '100%' as const,
      paddingHorizontal: spacing[4],
    },
    scroll: { minWidth: 0, flex: 1 },
    content: {
      paddingHorizontal: spacing[4],
      paddingTop: spacing[2],
      paddingBottom: spacing[10],
      gap: spacing[4],
    },
    calendarSwipeArea: {
      gap: spacing[2],
    },
    monthLabel: {
      ...font.headingSemiBold,
      flexShrink: 1,
      textAlign: 'center' as const,
    },
    weekCell: { alignItems: 'center' as const },
    weekLabel: {
      color: c.textTertiary,
    },
    dayCell: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing[0.5],
    },
    dayDisc: {
      minWidth: spacing[8],
      height: spacing[8],
      paddingHorizontal: spacing[1],
      borderRadius: radius.full,
      // Bordure toujours présente : sans elle, Android perd l'arrondi quand la sélection change le fond.
      borderWidth: 1,
      borderColor: 'transparent',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    dayDiscSelected: {
      backgroundColor: c.primary,
    },
    dayDiscToday: {
      borderWidth: 1,
      borderColor: c.primary,
    },
    dayNum: {
      ...font.medium,
      fontSize: fontSize.sm,
      color: c.textPrimary,
    },
    dayNumSelected: { ...font.semiBold, color: c.textInverse },
    dayNumToday: { ...font.semiBold, color: c.primary },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    dotVisible: {
      backgroundColor: c.primary,
    },
    dayHeader: {
      gap: spacing[0.5],
      paddingTop: spacing[2],
    },
    dayList: {
      gap: spacing[2],
    },
  };
}
