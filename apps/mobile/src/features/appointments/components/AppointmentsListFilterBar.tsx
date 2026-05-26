import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ListFilter, Search, X } from 'lucide-react-native';
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onOpenFilters?: () => void;
  advancedFilterCount?: number;
  chips?: FilterChip[];
  /** Dans un ScrollView déjà paddé (ex. calendrier) — pas de marge horizontale. */
  embedded?: boolean;
}

export function AppointmentsListFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  onOpenFilters,
  advancedFilterCount = 0,
  chips = [],
  embedded = false,
}: Props) {
  const showAdvanced = Boolean(onOpenFilters);
  const hasChips = chips.length > 0;

  return (
    <View style={[styles.wrap, embedded && styles.wrapEmbedded]}>
      <View style={styles.searchRow}>
        <View style={[styles.searchField, elevation.xs]}>
          <Search size={16} color={colors.textTertiary} strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => onSearchChange('')}
              hitSlop={8}
              accessibilityLabel="Effacer la recherche"
            >
              <X size={16} color={colors.textTertiary} strokeWidth={2} />
            </Pressable>
          ) : null}
        </View>

        {showAdvanced ? (
          <Pressable
            onPress={onOpenFilters}
            style={[styles.filterBtn, advancedFilterCount > 0 && styles.filterBtnActive]}
            accessibilityLabel="Filtres"
          >
            <ListFilter
              size={18}
              color={advancedFilterCount > 0 ? colors.primary : colors.textSecondary}
              strokeWidth={2}
            />
            {advancedFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{advancedFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>

      {hasChips ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {chips.map((chip) => (
            <Pressable
              key={chip.key}
              onPress={chip.onRemove}
              style={styles.chip}
              accessibilityLabel={`Retirer le filtre ${chip.label}`}
            >
              <Text style={styles.chipLabel}>{chip.label}</Text>
              <X size={14} color={colors.primary} strokeWidth={2.5} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    marginBottom: spacing[2],
  },
  wrapEmbedded: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    borderColor: colors.primaryMid,
    backgroundColor: colors.primaryLight,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: colors.textInverse,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingBottom: spacing[0.5],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingLeft: spacing[3],
    paddingRight: spacing[2],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  chipLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.primaryDark,
  },
});
