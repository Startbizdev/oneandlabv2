import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react-native';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface ChipOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface TabOption<T extends string> {
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
  tabs?: TabOption<TTab>[];
  tab?: TTab;
  onTabChange?: (v: TTab) => void;
  segments?: ChipOption<TSegment>[];
  segment?: TSegment;
  onSegmentChange?: (v: TSegment) => void;
  onApply: () => void;
  onReset: () => void;
  /** false si la recherche est déjà dans la barre liste */
  showSearch?: boolean;
  segmentSectionLabel?: string;
  secondarySegments?: ChipOption<TSecondary>[];
  secondarySegment?: TSecondary;
  onSecondarySegmentChange?: (v: TSecondary) => void;
  secondarySectionLabel?: string;
}

export function AppointmentsFilterSheet<
  TTab extends string = string,
  TSegment extends string = string,
  TSecondary extends string = string,
>({
  visible,
  onClose,
  title = 'Filtres et recherche',
  search,
  onSearchChange,
  searchPlaceholder = 'Nom, téléphone, adresse…',
  tabs,
  tab,
  onTabChange,
  segments,
  segment,
  onSegmentChange,
  onApply,
  onReset,
  showSearch = true,
  segmentSectionLabel = 'Statut',
  secondarySegments,
  secondarySegment,
  onSecondarySegmentChange,
  secondarySectionLabel = 'Type de soin',
}: Props<TTab, TSegment>) {
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle="Affinez la liste affichée"
      footer={
        <View style={styles.footerRow}>
          <View style={styles.footerBtn}>
            <Button title="Réinitialiser" variant="outline" onPress={onReset} fullWidth />
          </View>
          <View style={styles.footerBtn}>
            <Button title="Appliquer" onPress={onApply} fullWidth />
          </View>
        </View>
      }
    >
      {showSearch ? (
        <Input
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          leftIcon={<Search size={16} color={colors.textTertiary} strokeWidth={2} />}
        />
      ) : null}

      {tabs && tab && onTabChange ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Affichage</Text>
          <View style={styles.tabRow}>
            {tabs.map((t) => {
              const active = tab === t.value;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => onTabChange(t.value)}
                  style={[styles.tabBtn, active && styles.tabBtnActive]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                  {t.hint && active ? (
                    <Text style={styles.tabHint}>{t.hint}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {segments && segment !== undefined && onSegmentChange ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{segmentSectionLabel}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {segments.map((s) => {
                const active = segment === s.value;
                return (
                  <Pressable
                    key={s.value || 'all'}
                    onPress={() => onSegmentChange(s.value)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      ) : null}

      {secondarySegments && secondarySegment !== undefined && onSecondarySegmentChange ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{secondarySectionLabel}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipsRow}>
              {secondarySegments.map((s) => {
                const active = secondarySegment === s.value;
                return (
                  <Pressable
                    key={s.value || 'all-secondary'}
                    onPress={() => onSecondarySegmentChange(s.value)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {s.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
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
    gap: spacing[2],
  },
  tabBtn: {
    padding: spacing[3],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    gap: 4,
  },
  tabBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tabText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  tabTextActive: {
    color: colors.primaryDark,
  },
  tabHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: fontSize.xs * 1.4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  chipLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.primary,
  },
  footerRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingBottom: spacing[2],
  },
  footerBtn: {
    flex: 1,
  },
});
