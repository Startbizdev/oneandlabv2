import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { PASSAGE_TIME_SLOT_LABELS } from '../utils/passage-display';
import type { PassageDailyTimeSlot, PassageTimeSlot } from '@oneandlab/shared-types';
import { layoutRowWrap } from '@/theme/layout-styles';
import { radius, spacing, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const MULTI_SLOT_OPTIONS: PassageTimeSlot[] = ['morning', 'noon', 'afternoon', 'evening'];

type Props = {
  visible: boolean;
  slots: PassageDailyTimeSlot[];
  onClose: () => void;
  onConfirm: (slots: PassageDailyTimeSlot[]) => void;
};

export function PassageFormDailyTimesSheet({ visible, slots, onClose, onConfirm }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const [selected, setSelected] = useState<PassageTimeSlot[]>(['morning']);

  useEffect(() => {
    if (!visible) return;
    const ids = slots.map((s) => s.time_slot).filter((id) => MULTI_SLOT_OPTIONS.includes(id));
    setSelected(ids.length > 0 ? ids : ['morning']);
  }, [visible, slots]);

  const toggle = (id: PassageTimeSlot) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id].sort(
        (a, b) => MULTI_SLOT_OPTIONS.indexOf(a) - MULTI_SLOT_OPTIONS.indexOf(b),
      );
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Passages dans la journée"
      subtitle="Sélectionnez un ou plusieurs créneaux (ex. matin + après-midi)"
      snapPoints={['42%']}
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
          {MULTI_SLOT_OPTIONS.map((id) => {
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
                <AppText
                  style={{
                    color: on ? c.primaryDark : c.textSecondary,
                    fontFamily: fontFamily.semiBold,
                    fontSize: fontSize.sm,
                  }}
                >
                  {PASSAGE_TIME_SLOT_LABELS[id]}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </BottomSheet>
  );
}

function buildStyles(_c: AppColors) {
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
  };
}
