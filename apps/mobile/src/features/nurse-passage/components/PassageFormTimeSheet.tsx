import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { BookingTimeRangeSlider } from '@/features/appointments/form/components/BookingTimeRangeSlider';
import {
  availabilityMaxHour,
  availabilitySliderMinHour,
  clampAvailabilityRange,
} from '@/features/appointments/form/utils/booking-availability-utils';
import { PASSAGE_TIME_SLOT_LABELS } from '../utils/passage-display';
import { PassageTimePicker } from './PassageTimePicker';
import type { PassageTimeSlot } from '@oneandlab/shared-types';
import { resolvePassageTimeRange } from '@oneandlab/shared-utils';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Sélection UI — « range » = créneau horaire avec slider. */
type DraftSelection = PassageTimeSlot | 'range';

const SLOT_OPTIONS: Array<{ id: DraftSelection; label: string }> = [
  { id: 'morning', label: PASSAGE_TIME_SLOT_LABELS.morning },
  { id: 'noon', label: PASSAGE_TIME_SLOT_LABELS.noon },
  { id: 'afternoon', label: PASSAGE_TIME_SLOT_LABELS.afternoon },
  { id: 'evening', label: PASSAGE_TIME_SLOT_LABELS.evening },
  { id: 'night', label: PASSAGE_TIME_SLOT_LABELS.night },
  { id: 'custom', label: 'Personnalisée' },
  { id: 'all_day', label: 'Toute la journée' },
  { id: 'range', label: 'Créneau' },
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

function resolveInitialSelection(
  timeSlot: PassageTimeSlot,
  customTime: string,
  timeRange: [number, number] | null | undefined,
): DraftSelection {
  if (timeSlot === 'all_day') return 'all_day';
  if (timeSlot === 'custom') {
    if (!timeRange) return 'custom';
    const span = timeRange[1] - timeRange[0];
    if (span > 1) return 'range';
    const hour = parseInt((customTime || '09:00').split(':')[0] ?? '9', 10);
    if (Math.floor(timeRange[0]) === hour && span <= 1) return 'custom';
    return 'range';
  }
  return timeSlot;
}

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
  const minHour = availabilitySliderMinHour(passageDate, maxHour);

  const [draftSelection, setDraftSelection] = useState<DraftSelection>('morning');
  const [draftCustomTime, setDraftCustomTime] = useState('09:00');
  const [draftRange, setDraftRange] = useState<[number, number]>([8, 12]);

  useEffect(() => {
    if (!visible) return;
    setDraftSelection(resolveInitialSelection(timeSlot, customTime, timeRange));
    setDraftCustomTime(customTime || '09:00');
    setDraftRange(
      timeRange ??
        resolvePassageTimeRange({
          time_slot: timeSlot,
          custom_time: customTime,
        }),
    );
  }, [visible, timeSlot, customTime, timeRange]);

  useEffect(() => {
    if (draftSelection !== 'range') return;
    setDraftRange((prev) => clampAvailabilityRange(prev[0], prev[1], maxHour, minHour));
  }, [draftSelection, maxHour, minHour]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Heure de passage"
      snapPoints={draftSelection === 'range' ? ['72%'] : draftSelection === 'custom' ? ['58%'] : ['48%']}
      footer={
        <Button
          title="Valider"
          onPress={() => {
            if (draftSelection === 'all_day') {
              onConfirm('all_day', '', null);
            } else if (draftSelection === 'range') {
              onConfirm('custom', '', draftRange);
            } else if (draftSelection === 'custom') {
              onConfirm('custom', draftCustomTime, null);
            } else {
              onConfirm(draftSelection, '', null);
            }
            onClose();
          }}
        />
      }
    >
      <View style={styles.body}>
        <View style={styles.presetWrap}>
          {SLOT_OPTIONS.map((opt) => {
            const selected = draftSelection === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setDraftSelection(opt.id)}
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
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {draftSelection === 'custom' ? (
          <PassageTimePicker
            label="Heure"
            value={draftCustomTime}
            onChange={setDraftCustomTime}
          />
        ) : null}

        {draftSelection === 'range' ? (
          <BookingTimeRangeSlider
            min={minHour}
            max={maxHour}
            range={draftRange}
            onChange={setDraftRange}
          />
        ) : null}
      </View>
    </BottomSheet>
  );
}

function buildStyles(_c: AppColors) {
  return {
    body: { gap: spacing[3], paddingBottom: spacing[2] },
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
