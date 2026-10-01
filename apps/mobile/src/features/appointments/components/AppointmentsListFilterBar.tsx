import { useAppColors } from '@/theme/use-app-colors';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ListFilter, Search, X } from 'lucide-react-native';
import { Cluster, Row, Stack } from '@/components/layout/primitives';
import { ICON_STROKE_WIDTH, elevation, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

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
  /** Premier élément sous le header — supprime la marge haute par défaut. */
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
  const styles = useStyles(buildStyles);
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
          leading={<Search size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />}
          actions={
            search.length > 0 ? (
              <Pressable
                onPress={() => onSearchChange('')}
                hitSlop={8}
                accessibilityLabel="Effacer la recherche"
              >
                <X size={iconSize.sm} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
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
              size={iconSize.md}
              color={advancedFilterCount > 0 ? c.primary : c.textSecondary}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            {advancedFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <AppText style={styles.filterBadgeText} maxFontSizeMultiplier={1}>
                  {advancedFilterCount}
                </AppText>
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
                  <AppText style={styles.chipLabel}>{chip.label}</AppText>
                  <X size={iconSize.xs} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
                </Row>
              </Pressable>
            ))}
          </Row>
        </ScrollView>
      ) : null}
    </Stack>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
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
    ...font.regular,
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
    top: -spacing[1.5],
    right: -spacing[1.5],
    minWidth: 18,
    minHeight: 18,
    paddingHorizontal: spacing[1],
    borderRadius: radius.full,
    backgroundColor: c.primary,
    borderWidth: 1.5,
    borderColor: c.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  filterBadgeText: {
    ...font.bold,
    fontSize: fontSize['2xs'],
    lineHeight: Math.round(fontSize['2xs'] * 1.2),
    color: c.onPrimary,
    includeFontPadding: false,
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
    ...font.semiBold,
    fontSize: fontSize.xs,
    color: c.primaryDark,
  },
};
}
