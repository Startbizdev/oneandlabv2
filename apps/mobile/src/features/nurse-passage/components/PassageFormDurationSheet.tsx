import { layoutRowBetween } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PASSAGE_DURATION_PRESETS } from '@oneandlab/shared-types';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  visible: boolean;
  duration: number;
  customDuration: string;
  onClose: () => void;
  onConfirm: (duration: number, customDuration: string) => void;
};

const PRESET_OPTIONS = [
  ...PASSAGE_DURATION_PRESETS.map((min) => ({
    value: min,
    label: min === 60 ? '1 h' : `${min} min`,
  })),
  { value: -1, label: 'Autre durée' },
];

export function PassageFormDurationSheet({
  visible,
  duration,
  customDuration,
  onClose,
  onConfirm,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const [draftDuration, setDraftDuration] = useState(duration);
  const [draftCustom, setDraftCustom] = useState(customDuration);

  useEffect(() => {
    if (visible) {
      setDraftDuration(duration);
      setDraftCustom(customDuration);
    }
  }, [visible, duration, customDuration]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Durée du passage"
      subtitle="Temps prévu sur place chez le patient"
      snapPoints={['50%']}
      footer={
        <Button
          title="Valider"
          onPress={() => {
            onConfirm(draftDuration, draftCustom);
            onClose();
          }}
        />
      }
    >
      <View style={styles.list}>
        {PRESET_OPTIONS.map((opt) => {
          const selected = draftDuration === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setDraftDuration(opt.value)}
              style={[
                styles.option,
                {
                  borderColor: selected ? c.primary : c.borderLight,
                  backgroundColor: selected ? hexToRgba(c.primary, 0.08) : c.surface,
                },
              ]}
            >
              <AppText style={[styles.label, { color: c.textPrimary }]}>{opt.label}</AppText>
              {selected ? <Check size={iconSize.mdSm} color={c.primary} strokeWidth={2.5} /> : null}
            </Pressable>
          );
        })}
        {draftDuration === -1 ? (
          <Input
            value={draftCustom}
            onChangeText={setDraftCustom}
            keyboardType="number-pad"
            placeholder="Durée en minutes"
          />
        ) : null}
      </View>
    </BottomSheet>
  );
}

function buildStyles(_c: AppColors) {
  return {
    list: { gap: spacing[2], paddingBottom: spacing[4] },
    option: {
      ...layoutRowBetween(),
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: radius.lg,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3.5],
    },
    label: { fontFamily: fontFamily.semiBold, fontSize: fontSize.md },
  };
}
