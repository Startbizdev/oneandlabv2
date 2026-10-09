import { hexToRgba } from '@/theme/color-utils';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { PASSAGE_TIME_SLOT_LABELS } from '../utils/passage-display';
import {
  PRESET_DAILY_SLOTS,
  dailySlotTime,
  normalizeDailySlots,
  withDailySlotTime,
} from '../utils/passage-daily-slots';
import { PassageTimePicker } from './PassageTimePicker';
import type { PassageDailyTimeSlot, PassageTimeSlot } from '@oneandlab/shared-types';
import { layoutRowWrap } from '@/theme/layout-styles';
import { Row } from '@/components/layout/primitives';
import {
  ICON_STROKE_WIDTH,
  MIN_TOUCH_TARGET,
  iconSize,
  radius,
  spacing,
  AppText,
  useStyles,
  font,
  type Theme,
} from '@/theme';

const ALL_DAY_SLOT: PassageTimeSlot = 'all_day';
const CHIP_OPTIONS: PassageTimeSlot[] = [...PRESET_DAILY_SLOTS, ALL_DAY_SLOT];
const DEFAULT_ENTRIES: PassageDailyTimeSlot[] = [{ time_slot: 'morning', custom_time: null }];

type Props = {
  visible: boolean;
  slots: PassageDailyTimeSlot[];
  onClose: () => void;
  onConfirm: (slots: PassageDailyTimeSlot[]) => void;
};

function nextFreeTime(entries: PassageDailyTimeSlot[]): string {
  const taken = new Set(entries.map(dailySlotTime));
  for (let hour = 9; hour < 24; hour++) {
    const candidate = `${String(hour).padStart(2, '0')}:00`;
    if (!taken.has(candidate)) return candidate;
  }
  return '09:00';
}

export function PassageFormDailyTimesSheet({ visible, slots, onClose, onConfirm }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const [entries, setEntries] = useState<PassageDailyTimeSlot[]>(DEFAULT_ENTRIES);

  useEffect(() => {
    if (!visible) return;
    setEntries(slots.length > 0 ? slots : DEFAULT_ENTRIES);
  }, [visible, slots]);

  const isAllDay = entries.some((e) => e.time_slot === ALL_DAY_SLOT);

  const toggleChip = (id: PassageTimeSlot) => {
    setEntries((prev) => {
      if (id === ALL_DAY_SLOT) return [{ time_slot: ALL_DAY_SLOT, custom_time: null }];
      const timed = prev.filter((e) => e.time_slot !== ALL_DAY_SLOT);
      if (timed.some((e) => e.time_slot === id)) {
        const remaining = timed.filter((e) => e.time_slot !== id);
        return remaining.length > 0 ? remaining : timed;
      }
      return [...timed, { time_slot: id, custom_time: null }];
    });
  };

  const addExactTime = () => {
    setEntries((prev) => {
      const timed = prev.filter((e) => e.time_slot !== ALL_DAY_SLOT);
      return [...timed, { time_slot: 'custom', custom_time: nextFreeTime(timed) }];
    });
  };

  const updateTime = (index: number, hhmm: string) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? withDailySlotTime(e, hhmm) : e)));
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Créneaux de passage"
      subtitle="Un passage est créé chaque jour à chaque heure choisie."
      footer={
        <Button
          title="Valider"
          onPress={() => {
            onConfirm(normalizeDailySlots(entries));
            onClose();
          }}
        />
      }
    >
      <View style={styles.body}>
        <View style={styles.presetWrap}>
          {CHIP_OPTIONS.map((id) => {
            const on = entries.some((e) => e.time_slot === id);
            return (
              <Pressable
                key={id}
                onPress={() => toggleChip(id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                style={[
                  styles.presetChip,
                  {
                    borderColor: on ? c.primary : c.border,
                    backgroundColor: on ? hexToRgba(c.primary, 0.12) : c.surfaceAlt,
                  },
                ]}
              >
                <AppText style={[styles.presetLabel, { color: on ? c.primaryDark : c.textSecondary }]}>
                  {PASSAGE_TIME_SLOT_LABELS[id]}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {isAllDay ? null : (
          <View style={styles.times}>
            {entries.map((entry, index) => {
              const label = entry.time_slot === 'custom' ? 'Heure précise' : PASSAGE_TIME_SLOT_LABELS[entry.time_slot];
              return (
                <Row key={`${entry.time_slot}-${index}`} align="end">
                  <View style={styles.timePicker}>
                    <PassageTimePicker
                      label={label}
                      value={dailySlotTime(entry) ?? ''}
                      onChange={(hhmm) => updateTime(index, hhmm)}
                    />
                  </View>
                  {entries.length > 1 ? (
                    <Pressable
                      onPress={() => removeEntry(index)}
                      style={styles.removeBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Retirer ${label}`}
                    >
                      <X size={iconSize.sm} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
                    </Pressable>
                  ) : null}
                </Row>
              );
            })}
            <Button
              title="Ajouter une heure précise"
              variant="ghost"
              size="sm"
              leftIcon={<Plus size={iconSize.sm} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />}
              onPress={addExactTime}
            />
          </View>
        )}
      </View>
    </SheetModal>
  );
}

function buildStyles({ fontSize }: Theme) {
  return {
    body: { gap: spacing[3], paddingBottom: spacing[2] },
    presetWrap: {
      ...layoutRowWrap(spacing[2]),
    },
    presetChip: {
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      borderRadius: radius.full,
      borderWidth: 1,
    },
    presetLabel: {
      ...font.semiBold,
      fontSize: fontSize.sm,
    },
    times: { gap: spacing[1] },
    timePicker: { flex: 1, minWidth: 0 },
    removeBtn: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  };
}
