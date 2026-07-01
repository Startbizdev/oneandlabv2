import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TourSortMode } from '../api/nurse-tour.service';
import { H_PADDING, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';
import { hexToRgba } from '@/theme/color-utils';

const MODES: { id: TourSortMode; label: string }[] = [
  { id: 'smart', label: 'Intelligent' },
  { id: 'schedule', label: 'Créneaux' },
  { id: 'nearest', label: 'Proximité' },
  { id: 'manual', label: 'Manuel' },
];

type Props = {
  active: TourSortMode;
  locked: boolean;
  onSelect: (mode: TourSortMode, force?: boolean) => void;
  onReset: () => void;
};

export function TourSortModeChips({ active, locked, onSelect, onReset }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  const handleSelect = (mode: TourSortMode) => {
    if (mode === active) return;
    if (locked && mode !== 'manual') {
      Alert.alert(
        'Remplacer votre ordre ?',
        'Votre ordre manuel sera remplacé par une optimisation.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', style: 'destructive', onPress: () => onSelect(mode, true) },
        ],
      );
      return;
    }
    onSelect(mode, false);
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: c.textTertiary }]}>Ordre des passages</Text>
        {active !== 'manual' ? (
          <Text style={[styles.hint, { color: c.textTertiary }]}>
            Mode « Manuel » pour réorganiser
          </Text>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {MODES.map((m) => {
          const selected = active === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => handleSelect(m.id)}
              style={[
                styles.chip,
                { borderColor: selected ? c.primary : c.cardBorder },
                selected && { backgroundColor: c.primary },
                !selected && { backgroundColor: c.surfaceAlt },
              ]}
            >
              <Text style={[styles.text, { color: selected ? '#fff' : c.textSecondary }]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
        {locked ? (
          <Pressable
            onPress={onReset}
            style={[styles.chip, styles.resetChip, { borderColor: hexToRgba(c.error, 0.35) }]}
          >
            <Text style={[styles.text, { color: c.error }]}>Réinitialiser</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    section: { marginBottom: spacing[3], gap: spacing[2] },
    headerRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing[2],
      paddingHorizontal: H_PADDING,
    },
    label: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.6,
    },
    hint: {
      flex: 1,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.xs,
      textAlign: 'right' as const,
    },
    scroll: {
      gap: spacing[2],
      paddingHorizontal: H_PADDING,
    },
    chip: {
      paddingHorizontal: spacing[3.5],
      paddingVertical: spacing[2],
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    resetChip: { backgroundColor: 'transparent' },
    text: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm },
  };
}
