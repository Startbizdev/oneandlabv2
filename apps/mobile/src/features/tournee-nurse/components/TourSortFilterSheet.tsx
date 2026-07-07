import { layoutRowBetween } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Alert, Pressable, View } from 'react-native';
import { Check, RotateCcw } from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Row } from '@/components/layout/primitives';
import type { TourSortMode } from '../api/nurse-tour.service';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize, lh } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';

export const TOUR_SORT_MODES: { id: TourSortMode; label: string; hint: string }[] = [
  { id: 'smart', label: 'Intelligent', hint: 'Créneaux + proximité GPS' },
  { id: 'schedule', label: 'Créneaux', hint: 'Ordre horaire des passages' },
  { id: 'nearest', label: 'Proximité', hint: 'Du plus proche au plus loin' },
  { id: 'manual', label: 'Manuel', hint: 'Réorganiser avec les flèches' },
];

export function tourSortModeLabel(mode: TourSortMode): string {
  return TOUR_SORT_MODES.find((m) => m.id === mode)?.label ?? mode;
}

type Props = {
  visible: boolean;
  active: TourSortMode;
  locked: boolean;
  onClose: () => void;
  onSelect: (mode: TourSortMode, force?: boolean) => void;
  onReset: () => void;
};

export function TourSortFilterSheet({ visible, active, locked, onClose, onSelect, onReset }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  const handleSelect = (mode: TourSortMode) => {
    if (mode === active) {
      onClose();
      return;
    }
    if (locked && mode !== 'manual') {
      Alert.alert(
        'Remplacer votre ordre ?',
        'Votre ordre manuel sera remplacé par une optimisation.',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Confirmer',
            style: 'destructive',
            onPress: () => {
              onSelect(mode, true);
              onClose();
            },
          },
        ],
      );
      return;
    }
    onSelect(mode, false);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Ordre des passages"
      subtitle={`Actuel : ${tourSortModeLabel(active)}`}
    >
      <View style={styles.list}>
        {TOUR_SORT_MODES.map((mode) => {
          const selected = active === mode.id;
          return (
            <Pressable
              key={mode.id}
              onPress={() => handleSelect(mode.id)}
              style={[
                styles.option,
                {
                  borderColor: selected ? c.primary : c.borderLight,
                  backgroundColor: selected ? hexToRgba(c.primary, 0.08) : c.surfaceAlt,
                },
              ]}
            >
              <View style={styles.optionText}>
                <AppText style={[styles.optionLabel, { color: c.textPrimary }]}>{mode.label}</AppText>
                <AppText style={[styles.optionHint, { color: c.textTertiary }]}>{mode.hint}</AppText>
              </View>
              {selected ? <Check size={iconSize.md} color={c.primary} strokeWidth={2.5} /> : null}
            </Pressable>
          );
        })}

        {locked ? (
          <Pressable
            onPress={() => {
              onReset();
              onClose();
            }}
            style={[styles.resetBtn, { borderColor: hexToRgba(c.error, 0.35) }]}
          >
            <Row gap={spacing[2]} align="center">
              <RotateCcw size={iconSize.sm} color={c.error} />
              <AppText style={[styles.resetText, { color: c.error }]}>Réinitialiser l&apos;ordre</AppText>
            </Row>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

function buildStyles(_c: AppColors) {
  return {
    list: { gap: spacing[2] },
    option: {
      ...layoutRowBetween(spacing[3]),
      paddingHorizontal: spacing[3.5],
      paddingVertical: spacing[3],
      borderRadius: radius.lg,
      borderWidth: 1,
    },
    optionText: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    optionLabel: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm },
    optionHint: { fontFamily: fontFamily.regular, fontSize: fontSize.xs, lineHeight: lh(fontSize.xs) },
    resetBtn: {
      marginTop: spacing[2],
      paddingVertical: spacing[3],
      paddingHorizontal: spacing[3.5],
      borderRadius: radius.lg,
      borderWidth: 1,
      alignItems: 'center' as const,
    },
    resetText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm },
  };
}
