import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Clock, Sun } from 'lucide-react-native';
import { Row } from '@/components/layout/primitives';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { BookingTimeRangeSlider } from '@/features/appointments/form/components/BookingTimeRangeSlider';
import {
  availabilityMaxHour,
  availabilitySliderMinHour,
  clampAvailabilityRange,
} from '@/features/appointments/form/utils/booking-availability-utils';
import { PASSAGE_TIME_SLOT_LABELS } from '../utils/passage-display';
import type { PassageTimeSlot } from '@oneandlab/shared-types';
import {
  passagePresetRangeForSlot,
  passageSlotFromRange,
  resolvePassageTimeRange,
} from '@oneandlab/shared-utils';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type TimeMode = 'all_day' | 'range';

const PRESET_SLOTS: Exclude<PassageTimeSlot, 'custom' | 'all_day'>[] = [
  'morning',
  'noon',
  'afternoon',
  'evening',
  'night',
];

type Props = {
  visible: boolean;
  timeSlot: PassageTimeSlot;
  customTime: string;
  timeRange?: [number, number] | null;
  passageDate?: string;
  onClose: () => void;
  onConfirm: (
    timeSlot: PassageTimeSlot,
    customTime: string,
    timeRange: [number, number] | null,
  ) => void;
};

export function PassageFormTimeSheet({
  visible,
  timeSlot,
  customTime,
  timeRange,
  passageDate,
  onClose,
  onConfirm,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const maxHour = availabilityMaxHour('nursing');
  const minHour = useMemo(
    () => availabilitySliderMinHour(passageDate, maxHour),
    [passageDate, maxHour],
  );

  const [draftMode, setDraftMode] = useState<TimeMode>('range');
  const [draftRange, setDraftRange] = useState<[number, number]>([8, 12]);

  useEffect(() => {
    if (!visible) return;
    const mode: TimeMode = timeSlot === 'all_day' ? 'all_day' : 'range';
    setDraftMode(mode);
    setDraftRange(
      resolvePassageTimeRange({
        time_slot: timeSlot,
        custom_time: customTime,
        planning_config: timeRange ? { time_range: timeRange } : undefined,
      }),
    );
  }, [visible, timeSlot, customTime, timeRange]);

  useEffect(() => {
    if (draftMode !== 'range') return;
    setDraftRange((prev) => clampAvailabilityRange(prev[0], prev[1], maxHour, minHour));
  }, [draftMode, maxHour, minHour]);

  const applyPreset = (slot: Exclude<PassageTimeSlot, 'custom' | 'all_day'>) => {
    const preset = passagePresetRangeForSlot(slot);
    if (preset) setDraftRange(preset);
  };

  const activePreset = useMemo(() => {
    if (draftMode !== 'range') return null;
    const slot = passageSlotFromRange(draftRange);
    return slot === 'custom' ? null : slot;
  }, [draftMode, draftRange]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Heure de passage"
      snapPoints={['72%']}
      footer={
        <Button
          title="Valider"
          onPress={() => {
            if (draftMode === 'all_day') {
              onConfirm('all_day', '', null);
            } else {
              const slot = passageSlotFromRange(draftRange);
              const custom =
                slot === 'custom'
                  ? `${String(draftRange[0]).padStart(2, '0')}:00`
                  : customTime;
              onConfirm(slot, custom, draftRange);
            }
            onClose();
          }}
        />
      }
    >
      <View style={styles.body}>
        <Row gap={spacing[1]} style={styles.segmentShell}>
          <Pressable
            onPress={() => setDraftMode('all_day')}
            style={[styles.segment, draftMode === 'all_day' && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: draftMode === 'all_day' }}
          >
            <Row gap={spacing[1]} align="center" justify="center">
              <Sun
                size={15}
                color={draftMode === 'all_day' ? c.primaryDark : c.textTertiary}
                strokeWidth={2.2}
              />
              <Text
                style={[styles.segmentLabel, draftMode === 'all_day' && styles.segmentLabelActive]}
                numberOfLines={1}
              >
                Toute la journée
              </Text>
            </Row>
          </Pressable>
          <Pressable
            onPress={() => setDraftMode('range')}
            style={[styles.segment, draftMode === 'range' && styles.segmentActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: draftMode === 'range' }}
          >
            <Row gap={spacing[1]} align="center" justify="center">
              <Clock
                size={15}
                color={draftMode === 'range' ? c.primaryDark : c.textTertiary}
                strokeWidth={2.2}
              />
              <Text
                style={[styles.segmentLabel, draftMode === 'range' && styles.segmentLabelActive]}
                numberOfLines={1}
              >
                Créneau horaire
              </Text>
            </Row>
          </Pressable>
        </Row>

        {draftMode === 'range' ? (
          <>
            <View style={styles.presetWrap}>
              {PRESET_SLOTS.map((slot) => {
                const selected = activePreset === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => applyPreset(slot)}
                    style={[
                      styles.presetChip,
                      {
                        borderColor: selected ? c.primary : c.border,
                        backgroundColor: selected ? hexToRgba(c.primary, 0.12) : c.surfaceAlt,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      style={{
                        color: selected ? c.primaryDark : c.textSecondary,
                        fontFamily: fontFamily.semiBold,
                        fontSize: fontSize.xs,
                      }}
                    >
                      {PASSAGE_TIME_SLOT_LABELS[slot]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <BookingTimeRangeSlider
              min={minHour}
              max={maxHour}
              range={draftRange}
              onChange={setDraftRange}
            />
          </>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
    body: { gap: spacing[3], paddingBottom: spacing[2] },
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
      paddingHorizontal: spacing[1],
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
      fontSize: 10,
      lineHeight: 12,
      color: c.textTertiary,
      ...(Platform.OS === 'android'
        ? { includeFontPadding: false, textAlignVertical: 'center' as const }
        : null),
    },
    segmentLabelActive: {
      color: c.primaryDark,
    },
    presetWrap: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[1.5],
    },
    presetChip: {
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1.5],
      borderRadius: radius.full,
      borderWidth: 1,
    },
  };
}
