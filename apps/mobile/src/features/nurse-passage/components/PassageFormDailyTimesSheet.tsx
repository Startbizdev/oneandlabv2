import { hexToRgba } from '@/theme/color-utils';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import { Button } from '@/components/ui/Button';
import { PASSAGE_TIME_SLOT_LABELS } from '../utils/passage-display';
import type { PassageDailyTimeSlot, PassageTimeSlot } from '@oneandlab/shared-types';
import { layoutRowWrap } from '@/theme/layout-styles';
import { radius, spacing, AppText, useStyles, font, type Theme } from '@/theme';

const MULTI_SLOT_OPTIONS: PassageTimeSlot[] = ['morning', 'noon', 'afternoon', 'evening', 'night'];
const ALL_DAY_SLOT: PassageTimeSlot = 'all_day';
const SLOT_OPTIONS: PassageTimeSlot[] = [...MULTI_SLOT_OPTIONS, ALL_DAY_SLOT];

type Props = {
  visible: boolean;
  slots: PassageDailyTimeSlot[];
  onClose: () => void;
  onConfirm: (slots: PassageDailyTimeSlot[]) => void;
};

export function PassageFormDailyTimesSheet({ visible, slots, onClose, onConfirm }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const [selected, setSelected] = useState<PassageTimeSlot[]>(['morning']);

  useEffect(() => {
    if (!visible) return;
    const ids = slots.map((s) => s.time_slot).filter((id) => SLOT_OPTIONS.includes(id));
    setSelected(ids.length > 0 ? ids : ['morning']);
  }, [visible, slots]);

  const toggle = (id: PassageTimeSlot) => {
    setSelected((prev) => {
      if (id === ALL_DAY_SLOT) {
        return [ALL_DAY_SLOT];
      }
      const withoutAllDay = prev.filter((x) => x !== ALL_DAY_SLOT);
      if (prev.includes(id)) {
        if (withoutAllDay.length <= 1) return withoutAllDay;
        return withoutAllDay.filter((x) => x !== id);
      }
      return [...withoutAllDay, id].sort(
        (a, b) => MULTI_SLOT_OPTIONS.indexOf(a) - MULTI_SLOT_OPTIONS.indexOf(b),
      );
    });
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title="Créneaux de passage"
      subtitle="Choisissez les moments à créer chaque jour (ex. matin + midi)."
      footer={
        <Button
          title="Valider"
          onPress={() => {
            onConfirm(selected.map((time_slot) => ({ time_slot, custom_time: null })));
            onClose();
          }}
        />
      }
    >
      <View style={styles.body}>
        <View style={styles.presetWrap}>
          {SLOT_OPTIONS.map((id) => {
            const on = selected.includes(id);
            return (
              <Pressable
                key={id}
                onPress={() => toggle(id)}
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
  };
}
