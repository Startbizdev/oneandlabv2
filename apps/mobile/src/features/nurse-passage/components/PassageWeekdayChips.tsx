import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, Text, View } from 'react-native';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** ISO weekday 1 = lundi … 7 = dimanche */
const WEEKDAYS: { iso: number; label: string }[] = [
  { iso: 1, label: 'Lun' },
  { iso: 2, label: 'Mar' },
  { iso: 3, label: 'Mer' },
  { iso: 4, label: 'Jeu' },
  { iso: 5, label: 'Ven' },
  { iso: 6, label: 'Sam' },
  { iso: 7, label: 'Dim' },
];

type Props = {
  selected: number[];
  onChange: (weekdays: number[]) => void;
};

export function PassageWeekdayChips({ selected, onChange }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);

  const toggle = (iso: number) => {
    const set = new Set(selected);
    if (set.has(iso)) set.delete(iso);
    else set.add(iso);
    onChange([...set].sort((a, b) => a - b));
  };

  return (
    <View style={styles.row}>
      {WEEKDAYS.map(({ iso, label }) => {
        const on = selected.includes(iso);
        return (
          <Pressable
            key={iso}
            onPress={() => toggle(iso)}
            style={[
              styles.chip,
              {
                borderColor: on ? c.primary : c.border,
                backgroundColor: on ? hexToRgba(c.primary, 0.12) : c.surfaceAlt,
              },
            ]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={label}
          >
            <Text
              style={{
                fontFamily: fontFamily.semiBold,
                fontSize: fontSize.sm,
                color: on ? c.primaryDark : c.textSecondary,
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    row: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[2],
    },
    chip: {
      minWidth: 44,
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[2],
      borderRadius: radius.full,
      borderWidth: 1,
      alignItems: 'center' as const,
    },
  };
}
