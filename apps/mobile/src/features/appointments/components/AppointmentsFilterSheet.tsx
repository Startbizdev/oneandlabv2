import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react-native';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface ChipOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

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
  tabs?: ChipOption<TTab>[];
  tab?: TTab;
  onTabChange?: (v: TTab) => void;
  segments?: ChipOption<TSegment>[];
  segment?: TSegment;
  onSegmentChange?: (v: TSegment) => void;
  /** false si la recherche est déjà dans la barre liste */
  showSearch?: boolean;
  segmentSectionLabel?: string;
  secondarySegments?: ChipOption<TSecondary>[];
  secondarySegment?: TSecondary;
  onSecondarySegmentChange?: (v: TSecondary) => void;
  secondarySectionLabel?: string;
  /** Fermer la sheet après un choix (défaut true). */
  closeOnPick?: boolean;
}

function FilterTabRow<T extends string>({
  options,
  value,
  onChange,
  onClose,
  closeOnPick,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
  onClose: () => void;
  closeOnPick: boolean;
}) {
  const useEqualColumns = options.length <= 4;

  return (
    <View style={[styles.tabRow, useEqualColumns && options.length === 2 && styles.tabRowEqual]}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value || 'all'}
            onPress={() => {
              onChange(opt.value);
              if (closeOnPick) onClose();
            }}
            style={[
              styles.tabBtn,
              useEqualColumns && options.length <= 4 && styles.tabBtnFlex,
              active && styles.tabBtnActive,
            ]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]} numberOfLines={2}>
              {opt.label}
            </Text>
            {opt.hint && active ? <Text style={styles.tabHint}>{opt.hint}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
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
  closeOnPick = true,
}: Props<TTab, TSegment, TSecondary>) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle="Choisissez un onglet — le filtre s’applique tout de suite"
    >
      {showSearch ? (
        <Input
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          leftIcon={<Search size={16} color={colors.textTertiary} strokeWidth={2} />}
        />
      ) : null}

      {tabs && tab !== undefined && onTabChange ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Affichage</Text>
          <FilterTabRow
            options={tabs}
            value={tab}
            onChange={onTabChange}
            onClose={onClose}
            closeOnPick={closeOnPick}
          />
        </View>
      ) : null}

      {segments && segment !== undefined && onSegmentChange ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{segmentSectionLabel}</Text>
          <FilterTabRow
            options={segments}
            value={segment}
            onChange={onSegmentChange}
            onClose={onClose}
            closeOnPick={closeOnPick}
          />
        </View>
      ) : null}

      {secondarySegments && secondarySegment !== undefined && onSecondarySegmentChange ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{secondarySectionLabel}</Text>
          <FilterTabRow
            options={secondarySegments}
            value={secondarySegment}
            onChange={onSecondarySegmentChange}
            onClose={onClose}
            closeOnPick={closeOnPick}
          />
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[2],
  },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  tabRowEqual: {
    flexWrap: 'nowrap',
  },
  tabBtn: {
    padding: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    gap: 4,
    minWidth: '47%',
  },
  tabBtnFlex: {
    flex: 1,
    minWidth: 0,
  },
  tabBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
  tabHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.4,
    textAlign: 'center',
  },
});
