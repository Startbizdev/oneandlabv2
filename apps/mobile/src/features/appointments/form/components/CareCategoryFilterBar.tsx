import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CareFilterTab } from '../utils/booking-care-catalog';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  tabs: CareFilterTab[];
  value: string;
  onChange: (value: string) => void;
}

/** Filtres horizontaux par grande catégorie (aligné web RendezVousCareSelection). */
export function CareCategoryFilterBar({ tabs, value, onChange }: Props) {
  if (tabs.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {tabs.map((tab) => {
          const on = value === tab.value;
          return (
            <Pressable
              key={tab.value}
              onPress={() => onChange(on ? 'all' : tab.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipLabel, on && styles.chipLabelOn]} numberOfLines={1}>
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
  wrap: {
    marginBottom: spacing[2],
  },
  scroll: {
    gap: spacing[1.5],
    paddingRight: spacing[1],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  chipLabelOn: {
    color: colors.primaryDark,
  },
});
