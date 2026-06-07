import type { AppColors } from '@/theme/colors';
import { getThemedStyles } from '@/theme/use-themed-styles';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export interface FilterChipOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T extends string> {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Pills de filtre — même style que la barre liste (compact, wrap). */
export function FilterOptionChips<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value || '__all'}
            onPress={() => onChange(opt.value)}
            style={[styles.chip, active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={2}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
      {options.find((o) => o.value === value)?.hint ? (
        <Text style={styles.hint}>{options.find((o) => o.value === value)!.hint}</Text>
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  chipActive: {
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  labelActive: {
    color: c.primaryDark,
  },
  hint: {
    width: '100%',
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    lineHeight: fontSize.xs * 1.4,
    marginTop: -spacing[1],
  },
};
}

const styles = new Proxy({} as Record<string, any>, {
  get(_target, prop: string | symbol) {
    if (typeof prop === 'string') {
      return getThemedStyles('components_ui_FilterOptionChips_tsx_styles', buildStyles)[prop];
    }
    return undefined;
  },
});
