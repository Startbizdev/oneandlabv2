import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { FilterOptionChips, type FilterChipOption } from '@/components/ui/FilterOptionChips';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react-native';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props<
  TTab extends string = string,
  TSegment extends string = string,
  TSecondary extends string = string,
> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  tabs?: FilterChipOption<TTab>[];
  tab?: TTab;
  onTabChange?: (v: TTab) => void;
  segments?: FilterChipOption<TSegment>[];
  segment?: TSegment;
  onSegmentChange?: (v: TSegment) => void;
  showSearch?: boolean;
  segmentSectionLabel?: string;
  secondarySegments?: FilterChipOption<TSecondary>[];
  secondarySegment?: TSecondary;
  onSecondarySegmentChange?: (v: TSecondary) => void;
  secondarySectionLabel?: string;
  /** Fermer la sheet après un choix (filtre à une seule dimension). */
  closeOnPick?: boolean;
  onReset?: () => void;
}

export function AppointmentsFilterSheet<
  TTab extends string = string,
  TSegment extends string = string,
  TSecondary extends string = string,
>({
  visible,
  onClose,
  title = 'Filtres',
  search,
  onSearchChange,
  searchPlaceholder = 'Nom, téléphone, adresse…',
  tabs,
  tab,
  onTabChange,
  segments,
  segment,
  onSegmentChange,
  showSearch = true,
  segmentSectionLabel = 'Statut',
  secondarySegments,
  secondarySegment,
  onSecondarySegmentChange,
  secondarySectionLabel = 'Type de soin',
  closeOnPick = false,
  onReset,
}: Props<TTab, TSegment, TSecondary>) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'AppointmentsFilterSheet');
  const pick = <T extends string>(onChange: (v: T) => void) => (v: T) => {
    onChange(v);
    if (closeOnPick) onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      {showSearch ? (
        <Input
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          leftIcon={<Search size={16} color={c.textTertiary} strokeWidth={2} />}
        />
      ) : null}

      {tabs && tab !== undefined && onTabChange ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Affichage</Text>
          <FilterOptionChips options={tabs} value={tab} onChange={pick(onTabChange)} />
        </View>
      ) : null}

      {segments && segment !== undefined && onSegmentChange ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{segmentSectionLabel}</Text>
          <FilterOptionChips options={segments} value={segment} onChange={pick(onSegmentChange)} />
        </View>
      ) : null}

      {secondarySegments && secondarySegment !== undefined && onSecondarySegmentChange ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{secondarySectionLabel}</Text>
          <FilterOptionChips
            options={secondarySegments}
            value={secondarySegment}
            onChange={pick(onSecondarySegmentChange)}
          />
        </View>
      ) : null}

      {onReset ? (
        <Pressable onPress={onReset} hitSlop={8} style={styles.resetBtn}>
          <Text style={styles.resetText}>Réinitialiser les filtres</Text>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}

function buildStyles(c: AppColors) {
  return {
  section: {
    gap: spacing[2],
  },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: c.textTertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  resetBtn: {
    alignSelf: 'center' as const,
    paddingVertical: spacing[2],
  },
  resetText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
  },
};
}
