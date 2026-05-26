import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { catalogGroupFilterEmoji, type CareFilterTab } from '../utils/booking-care-catalog';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  tabs: CareFilterTab[];
  /** `all` = tous les soins affichés, aucun chip actif (pas d’onglet « Tous »). */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Filtres horizontaux — même pattern que le reste de l’app (ScrollView + Pressable + StyleSheet).
 * React Native : `View` / `Text` / `Pressable` sont les primitives officielles (pas du HTML/CSS).
 */
export function CareCategoryFilterBar({ tabs, value, onChange }: Props) {
  if (tabs.length === 0) return null;

  return (
    <View style={styles.shell}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {tabs.map((tab) => {
          const active = value === tab.value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => onChange(active ? 'all' : tab.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={styles.chipEmoji} accessibilityElementsHidden>
                {catalogGroupFilterEmoji(tab.value)}
              </Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]} numberOfLines={1}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingVertical: spacing[1],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingRight: spacing[1],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipEmoji: {
    fontSize: 15,
    lineHeight: 18,
  },
  chipLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.primaryDark,
  },
});
