import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock, Sun } from 'lucide-react-native';
import { BookingTimeRangeSlider } from './BookingTimeRangeSlider';
import {
  availabilityMaxHour,
  availabilitySliderMinHour,
  clampAvailabilityRange,
} from '../utils/booking-availability-utils';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  scheduledAt: string;
  serviceType?: string;
  availabilityType: 'all_day' | 'custom';
  range: [number, number];
  onAvailabilityType: (t: 'all_day' | 'custom') => void;
  onRange: (r: [number, number]) => void;
}

const TABS = [
  { id: 'all_day' as const, label: 'Toute la journée', icon: Sun },
  { id: 'custom' as const, label: 'Créneau horaire', icon: Clock },
];

export function BookingAvailabilitySection({
  scheduledAt,
  serviceType,
  availabilityType,
  range,
  onAvailabilityType,
  onRange,
}: Props) {
  const maxHour = availabilityMaxHour(serviceType);
  const minHour = useMemo(
    () => availabilitySliderMinHour(scheduledAt, maxHour),
    [scheduledAt, maxHour],
  );

  useEffect(() => {
    if (availabilityType !== 'custom') return;
    const clamped = clampAvailabilityRange(range[0], range[1], maxHour, minHour);
    if (clamped[0] !== range[0] || clamped[1] !== range[1]) {
      onRange(clamped);
    }
  }, [availabilityType, maxHour, minHour, scheduledAt, range, onRange]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Disponibilité</Text>

      <View style={styles.segmentShell}>
        {TABS.map((tab) => {
          const on = availabilityType === tab.id;
          const Icon = tab.icon;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onAvailabilityType(tab.id)}
              style={[styles.segment, on && styles.segmentActive]}
            >
              <Icon
                size={15}
                color={on ? colors.primaryDark : colors.textTertiary}
                strokeWidth={2.2}
              />
              <Text style={[styles.segmentLabel, on && styles.segmentLabelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {availabilityType === 'custom' ? (
        <BookingTimeRangeSlider
          min={minHour}
          max={maxHour}
          range={range}
          onChange={onRange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing[2] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  segmentShell: {
    flexDirection: 'row',
    gap: spacing[1],
    padding: spacing[0.5],
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    minHeight: 40,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
  },
  segmentActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  segmentLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  segmentLabelActive: {
    color: colors.primaryDark,
  },
});
