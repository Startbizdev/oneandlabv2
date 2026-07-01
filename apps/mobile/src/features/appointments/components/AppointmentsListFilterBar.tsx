import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ListFilter, Search, X } from 'lucide-react-native';
import { Cluster, Row, Stack } from '@/components/layout/primitives';
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
  /** Premier élément sous le header glass — supprime la marge haute par défaut. */
  compactTop?: boolean;
}

type SearchHostProps = Omit<Props, 'search' | 'onSearchChange'> & {
  onQueryChange: (value: string) => void;
};

/**
 * État de recherche local — à utiliser dans un ListHeader stable (sans `search` dans les deps),
 * sinon FlashList remonte le champ et le clavier perd le focus à chaque lettre.
 */
export function AppointmentsListSearchHost({
  onQueryChange,
  compactTop,
  ...barProps
}: SearchHostProps) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 280);

  useEffect(() => {
    onQueryChange(debouncedSearch);
  }, [debouncedSearch, onQueryChange]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  return (
    <AppointmentsListFilterBar
      {...barProps}
      compactTop={compactTop}
      search={search}
      onSearchChange={handleSearchChange}
    />
  );
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
  compactTop = false,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const showAdvanced = Boolean(onOpenFilters);
  const hasChips = chips.length > 0;

  return (
    <Stack
      gap={spacing[2]}
      style={[
        styles.wrap,
        embedded && styles.wrapEmbedded,
        embedded && compactTop && styles.wrapEmbeddedCompactTop,
        embedded && followedByBookCta && styles.wrapEmbeddedBeforeBookCta,
      ]}
    >
      <Row gap={spacing[2]} align="center" style={styles.searchRow}>
        <Cluster
          gap={spacing[2]}
          align="center"
          style={[styles.searchField, elevation.xs]}
          leading={<Search size={16} color={c.textTertiary} strokeWidth={2} />}
          actions={
            search.length > 0 ? (
              <Pressable
                onPress={() => onSearchChange('')}
                hitSlop={8}
                accessibilityLabel="Effacer la recherche"
              >
                <X size={16} color={c.textTertiary} strokeWidth={2} />
              </Pressable>
            ) : undefined
          }
        >
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={c.textTertiary}
            style={styles.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </Cluster>

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
      </Row>

      {hasChips ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Row gap={spacing[2]} style={styles.chipsRow}>
            {chips.map((chip) => (
              <Pressable
                key={chip.key}
                onPress={chip.onRemove}
                style={styles.chip}
                accessibilityLabel={`Retirer le filtre ${chip.label}`}
              >
                <Row gap={spacing[1]} align="center">
                  <Text style={styles.chipLabel}>{chip.label}</Text>
                  <X size={14} color={c.primary} strokeWidth={2.5} />
                </Row>
              </Pressable>
            ))}
          </Row>
        </ScrollView>
      ) : null}
    </Stack>
  );
}

function buildStyles(c: AppColors) {
  return {
  wrap: {
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    marginBottom: spacing[2],
    alignSelf: 'stretch' as const,
  },
  wrapEmbedded: {
    marginHorizontal: 0,
    marginTop: spacing[2],
    marginBottom: spacing[2],
    width: '100%' as const,
  },
  wrapEmbeddedCompactTop: {
    marginTop: 0,
  },
  wrapEmbeddedBeforeBookCta: {
    marginBottom: 0,
  },
  searchRow: {
    minWidth: 0,
    alignSelf: 'stretch' as const,
    width: '100%' as const,
  },
  searchField: {
    flex: 1,
    minWidth: 0,
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
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  filterBtnActive: {
    borderColor: c.primaryMid,
    backgroundColor: c.primaryLight,
  },
  filterBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.xs,
    color: c.textInverse,
  },
  chipsRow: {
    minWidth: 0,
    paddingBottom: spacing[0.5],
  },
  chip: {
    minWidth: 0,
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
