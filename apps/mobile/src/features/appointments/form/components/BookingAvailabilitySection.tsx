import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';

import { useEffect, useMemo } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import { Clock, Sun } from 'lucide-react-native';
import { BookingTimeRangeSlider } from './BookingTimeRangeSlider';
import {
  availabilityMaxHour,
  availabilitySliderMinHour,
  clampAvailabilityRange,
} from '../utils/booking-availability-utils';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';

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
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_BookingAvailabilitySection_tsx_styles');
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

      <Row gap={spacing[1]} style={styles.segmentShell}>
        {TABS.map((tab) => {
          const on = availabilityType === tab.id;
          const Icon = tab.icon;
          return (
            <Pressable
              key={tab.id}
              onPress={() => onAvailabilityType(tab.id)}
              style={[styles.segment, on && styles.segmentActive]}
            >
              <Row gap={spacing[1.5]} align="center" justify="center">
                <Icon
                  size={15}
                  color={on ? c.primaryDark : c.textTertiary}
                  strokeWidth={2.2}
                />
                <Text style={[styles.segmentLabel, on && styles.segmentLabelActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </Row>
            </Pressable>
          );
        })}
      </Row>

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

function buildStyles(c: AppColors) {
  return {
  wrap: { gap: spacing[2] },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textPrimary,
  },
  segmentShell: {
    padding: spacing[0.5],
    borderRadius: radius.lg,
    backgroundColor: c.surfaceSubtle,
  },
  segment: {
    minWidth: 0,
    flex: 1,
    minHeight: 40,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  segmentActive: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  segmentLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    lineHeight: lh(fontSize.xs, 1.15),
    color: c.textTertiary,
    ...(Platform.OS === 'android'
      ? { includeFontPadding: false, textAlignVertical: 'center' as const }
      : null),
  },
  segmentLabelActive: {
    color: c.primaryDark,
  },
};
}

