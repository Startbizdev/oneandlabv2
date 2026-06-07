import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ListFilter, Search, X } from 'lucide-react-native';
import { elevation, radius, spacing } from '@/theme';
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
  /** Recherche suivie du CTA « Prendre RDV » — évite le double espacement vertical. */
  followedByBookCta?: boolean;
}

export function AppointmentsListFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  onOpenFilters,
  advancedFilterCount = 0,
  chips = [],
  embedded = false,
  followedByBookCta = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const showAdvanced = Boolean(onOpenFilters);
  const hasChips = chips.length > 0;

  return (
    <View
      style={[
        styles.wrap,
        embedded && styles.wrapEmbedded,
        embedded && followedByBookCta && styles.wrapEmbeddedBeforeBookCta,
      ]}
    >
      <View style={styles.searchRow}>
        <View style={[styles.searchField, elevation.xs]}>
          <Search size={16} color={c.textTertiary} strokeWidth={2} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={c.textTertiary}
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
              <X size={16} color={c.textTertiary} strokeWidth={2} />
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
              color={advancedFilterCount > 0 ? c.primary : c.textSecondary}
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
              <X size={14} color={c.primary} strokeWidth={2.5} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    marginBottom: spacing[2],
    alignSelf: 'stretch',
  },
  wrapEmbedded: {
    marginHorizontal: 0,
    marginTop: spacing[2],
    marginBottom: spacing[2],
    width: '100%',
  },
  wrapEmbeddedBeforeBookCta: {
    marginBottom: 0,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    alignSelf: 'stretch',
    width: '100%',
  },
  searchField: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderLight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textPrimary,
    paddingVertical: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.borderLight,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    borderColor: c.primaryMid,
    backgroundColor: c.primaryLight,
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: c.textInverse,
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
    backgroundColor: c.primaryLight,
    borderWidth: 1,
    borderColor: c.primaryMid,
  },
  chipLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.primaryDark,
  },
};
}
