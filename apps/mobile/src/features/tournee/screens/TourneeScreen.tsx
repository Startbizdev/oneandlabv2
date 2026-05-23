import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react-native';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/auth-store';
import { fetchAppointments } from '@/features/appointments/api/appointments.service';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueryFlatList } from '@/components/ui/QueryFlatList';
import { EMPTY_RDV_IMAGE, EMPTY_RDV_IMAGE_HEIGHT, EMPTY_RDV_IMAGE_WIDTH } from '@/constants/empty-state-images';
import type { Appointment } from '@oneandlab/shared-types';
import { formatAvailabilityDisplayFr } from '@/utils/appointment-datetime-fr';
import { appointmentAddressLine } from '@/utils/appointment-display';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const OFFSET_MIN = -90;
const OFFSET_MAX = 90;

function dateRangeForOffset(offset: number) {
  const start = dayjs().add(offset, 'day').startOf('day');
  const end = start.endOf('day');
  return {
    date_from: start.format('YYYY-MM-DD HH:mm:ss'),
    date_to: end.format('YYYY-MM-DD HH:mm:ss'),
  };
}

interface StopCardProps {
  item: Appointment;
  index: number;
  onPress: () => void;
}

const StopCard = React.memo(function StopCard({ item, index, onPress }: StopCardProps) {
  const fd = item.form_data as {
    first_name?: string;
    last_name?: string;
    availability?: unknown;
  } | undefined;
  const name = fd?.first_name && fd?.last_name ? `${fd.first_name} ${fd.last_name}` : 'Patient';
  const address = appointmentAddressLine(item);
  const timeLabel = formatAvailabilityDisplayFr(fd?.availability, item.scheduled_at);

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()}>
      <Pressable onPress={onPress} style={[styles.stopCardShell, elevation.md]}>
        <View style={styles.stopCard}>
        <View style={styles.stopIndex}>
          <Text style={styles.stopIndexText}>{index + 1}</Text>
        </View>
        <View style={styles.stopInfo}>
          <Text style={styles.stopName}>{name}</Text>
          <View style={styles.stopMeta}>
            <Clock size={12} color={colors.primary} strokeWidth={2} />
            <Text style={styles.stopTime}>{timeLabel || '—'}</Text>
            {address ? (
              <>
                <View style={styles.metaDot} />
                <MapPin size={12} color={colors.textTertiary} strokeWidth={2} />
                <Text style={styles.stopAddress} numberOfLines={1}>{address}</Text>
              </>
            ) : null}
          </View>
        </View>
        <StatusBadge status={item.status} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

export function TourneeScreen() {
  const router = useRouter();
  const userId = useAuthStore((s) => s.user?.id);
  const [dayOffset, setDayOffset] = useState(0);

  const { date_from, date_to } = useMemo(() => dateRangeForOffset(dayOffset), [dayOffset]);

  const query = useQuery({
    queryKey: ['tournee', dayOffset, userId],
    queryFn: async () => {
      const res = await fetchAppointments({ limit: 500, type: 'blood_test', page: 1, date_from, date_to });
      if (!res.success) throw new Error(res.error);
      return (res.data ?? []).filter((a) => String(a.assigned_to ?? '') === String(userId));
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  const { data } = query;

  const sorted = useMemo(
    () => [...(data ?? [])].sort((a, b) => dayjs(a.scheduled_at).valueOf() - dayjs(b.scheduled_at).valueOf()),
    [data],
  );

  const shiftDay = useCallback((d: number) => {
    setDayOffset((o) => {
      const next = o + d;
      if (next < OFFSET_MIN || next > OFFSET_MAX) return o;
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: Appointment; index: number }) => (
      <StopCard
        item={item}
        index={index}
        onPress={() => router.push(`/(preleveur)/appointment/${item.id}`)}
      />
    ),
    [router],
  );

  const dayLabel = dayjs().add(dayOffset, 'day');
  const isToday = dayOffset === 0;

  return (
    <View style={styles.container}>
      {/* Date navigator */}
      <Animated.View entering={FadeInDown.duration(280).springify()} style={[styles.dateNav, elevation.xs]}>
        <Pressable
          onPress={() => shiftDay(-1)}
          disabled={dayOffset <= OFFSET_MIN}
          style={[styles.navBtn, dayOffset <= OFFSET_MIN && styles.navBtnDisabled]}
          hitSlop={12}
        >
          <ChevronLeft size={20} color={dayOffset <= OFFSET_MIN ? colors.textTertiary : colors.primary} strokeWidth={2.5} />
        </Pressable>
        <View style={styles.dateCenter}>
          {isToday ? <Text style={styles.todayBadge}>Aujourd'hui</Text> : null}
          <Text style={styles.dateLabel}>{dayLabel.format('dddd D MMMM YYYY')}</Text>
          {sorted.length > 0 ? (
            <Text style={styles.stopCount}>{sorted.length} arrêt{sorted.length > 1 ? 's' : ''}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => shiftDay(1)}
          disabled={dayOffset >= OFFSET_MAX}
          style={[styles.navBtn, dayOffset >= OFFSET_MAX && styles.navBtnDisabled]}
          hitSlop={12}
        >
          <ChevronRight size={20} color={dayOffset >= OFFSET_MAX ? colors.textTertiary : colors.primary} strokeWidth={2.5} />
        </Pressable>
      </Animated.View>

      <QueryFlatList
        query={query}
        items={sorted}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        skeletonHeight={80}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  dateCenter: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  todayBadge: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xs'],
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dateLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  stopCount: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  list: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
    flexGrow: 1,
  },
  stopCardShell: {
    borderRadius: radius.xl,
  },
  stopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing[4],
    overflow: 'hidden',
  },
  stopIndex: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stopIndexText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.primary,
  },
  stopInfo: {
    flex: 1,
    gap: spacing[1],
  },
  stopName: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  stopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    flexWrap: 'wrap',
  },
  stopTime: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textTertiary,
  },
  stopAddress: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    flex: 1,
  },
});
