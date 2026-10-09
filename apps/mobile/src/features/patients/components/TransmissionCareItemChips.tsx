import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import type { TransmissionCareItem } from '@oneandlab/shared-types';
import { careItemKey } from '@oneandlab/shared-utils';
import { ICON_STROKE_WIDTH, MIN_TOUCH_TARGET, AppText, font, iconSize, radius, spacing, useStyles, type Theme } from '@/theme';
import { useAppColors } from '@/theme/use-app-colors';
interface Props {
  items: TransmissionCareItem[];
  /** Absent : pastilles en lecture seule (fil). */
  selected?: TransmissionCareItem[];
  onToggle?: (item: TransmissionCareItem) => void;
}

/** Soins d'une transmission : pastilles cochables à la saisie, ou simples pastilles dans le fil. */
export function TransmissionCareItemChips({ items, selected, onToggle }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const selectedKeys = new Set((selected ?? []).map(careItemKey));

  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const key = careItemKey(item);
        if (!onToggle) {
          return (
            <View key={key} style={[styles.chip, styles.chipStatic]}>
              <AppText style={styles.label}>{item.label}</AppText>
            </View>
          );
        }
        const checked = selectedKeys.has(key);
        return (
          <Pressable
            key={key}
            onPress={() => onToggle(item)}
            style={[styles.chip, styles.chipCheckable, checked && styles.chipChecked]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            accessibilityLabel={item.label}
          >
            {checked ? <Check size={iconSize.xs} color={c.primaryDark} strokeWidth={ICON_STROKE_WIDTH} /> : null}
            <AppText style={[styles.label, checked && styles.labelChecked]}>{item.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    wrap: {
      minWidth: 0,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing[2],
    },
    chip: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing[1],
      maxWidth: '100%' as const,
      borderRadius: radius.full,
      borderWidth: StyleSheet.hairlineWidth * 2,
    },
    chipStatic: {
      paddingHorizontal: spacing[2.5],
      paddingVertical: spacing[1],
      backgroundColor: c.surfaceAlt,
      borderColor: c.borderLight,
    },
    chipCheckable: {
      minHeight: MIN_TOUCH_TARGET,
      paddingHorizontal: spacing[3],
      paddingVertical: spacing[2],
      backgroundColor: c.surface,
      borderColor: c.border,
    },
    chipChecked: {
      backgroundColor: c.primaryLight,
      borderColor: c.primary,
    },
    label: {
      ...font.medium,
      flexShrink: 1,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    labelChecked: {
      color: c.primaryDark,
    },
  };
}
