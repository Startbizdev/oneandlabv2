import { useAppColors } from '@/theme/use-app-colors';
import { Pressable, StyleSheet, View } from 'react-native';
import { SheetModal } from '@/components/ui/SheetModal';
import { FilterOptionChips, type FilterChipOption } from '@/components/ui/FilterOptionChips';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react-native';
import { ICON_STROKE_WIDTH, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

interface Props<
  TTab extends string = string,
  TSegment extends string = string,
  TSecondary extends string = string,
> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** Champ de recherche affiché seulement si `onSearchChange` est fourni. */
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  tabs?: FilterChipOption<TTab>[];
  tab?: TTab;
  onTabChange?: (v: TTab) => void;
  segments?: FilterChipOption<TSegment>[];
  segment?: TSegment;
  onSegmentChange?: (v: TSegment) => void;
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
  segmentSectionLabel = 'Statut',
  secondarySegments,
  secondarySegment,
  onSecondarySegmentChange,
  secondarySectionLabel = 'Type de soin',
  closeOnPick = false,
  onReset,
}: Props<TTab, TSegment, TSecondary>) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const pick = <T extends string>(onChange: (v: T) => void) => (v: T) => {
    onChange(v);
    if (closeOnPick) onClose();
  };

  return (
    <SheetModal visible={visible} onClose={onClose} title={title}>
      {onSearchChange ? (
        <Input
          value={search ?? ''}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          leftIcon={<Search size={iconSize.md} color={c.textTertiary} strokeWidth={ICON_STROKE_WIDTH} />}
        />
      ) : null}

      {tabs && tab !== undefined && onTabChange ? (
        <View style={styles.section}>
          <AppText style={styles.sectionLabel}>Affichage</AppText>
          <FilterOptionChips options={tabs} value={tab} onChange={pick(onTabChange)} />
        </View>
      ) : null}

      {segments && segment !== undefined && onSegmentChange ? (
        <View style={styles.section}>
          <AppText style={styles.sectionLabel}>{segmentSectionLabel}</AppText>
          <FilterOptionChips options={segments} value={segment} onChange={pick(onSegmentChange)} />
        </View>
      ) : null}

      {secondarySegments && secondarySegment !== undefined && onSecondarySegmentChange ? (
        <View style={styles.section}>
          <AppText style={styles.sectionLabel}>{secondarySectionLabel}</AppText>
          <FilterOptionChips
            options={secondarySegments}
            value={secondarySegment}
            onChange={pick(onSecondarySegmentChange)}
          />
        </View>
      ) : null}

      {onReset ? (
        <Pressable onPress={onReset} hitSlop={8} style={styles.resetBtn}>
          <AppText style={styles.resetText}>Réinitialiser les filtres</AppText>
        </Pressable>
      ) : null}
    </SheetModal>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
  section: {
    gap: spacing[2],
  },
  sectionLabel: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.textSecondary,
  },
  resetBtn: {
    alignSelf: 'center' as const,
    paddingVertical: spacing[2],
  },
  resetText: {
    ...font.semiBold,
    fontSize: fontSize.sm,
    color: c.primary,
  },
};
}
