import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { FlashList, type ListRenderItem as FlashListRenderItem } from '@shopify/flash-list';
import { Check, Search } from 'lucide-react-native';
import { Cluster } from '@/components/layout/primitives';
import { SheetModal } from '@/components/ui/SheetModal';
import { Input } from '@/components/ui/Input';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import {
  patientDisplayName,
  patientListSubtitle,
  patientPickerOptionFromRow,
} from '@/features/patients/utils/patient-contact-display';
import { spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

const H_PAD = spacing[4];
const LIST_MAX_HEIGHT = 400;
const ROW_DRAW_DISTANCE = 72 * 4;

function ListSeparator() {
  const styles = useStyles(buildSeparatorStyles);
  return <View style={styles.separator} />;
}

function patientMatchesSearch(p: PatientRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const opt = patientPickerOptionFromRow(p);
  return (
    opt.label.toLowerCase().includes(q) ||
    opt.searchText.toLowerCase().includes(q) ||
    (p.nir?.replace(/\s/g, '').includes(q.replace(/\s/g, '')) ?? false)
  );
}

interface Props {
  visible: boolean;
  onClose: () => void;
  patients: PatientRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
  totalCount?: number;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  searchPlaceholder?: string;
}

export function PrescriptionPatientSelectSheet({
  visible,
  onClose,
  patients,
  selectedId,
  onSelect,
  loading = false,
  totalCount,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  searchPlaceholder = 'Rechercher un patient…',
}: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const filtered = useMemo(() => {
    if (!query.trim()) return patients;
    return patients.filter((p) => patientMatchesSearch(p, query));
  }, [patients, query]);

  const resolvedTotal = totalCount ?? patients.length;
  const initialLoading = loading && patients.length === 0;

  const handleClose = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);

  const handlePick = useCallback(
    (id: string) => {
      onSelect(id);
      setQuery('');
      onClose();
    },
    [onClose, onSelect],
  );

  const renderItem: FlashListRenderItem<PatientRow> = useCallback(
    ({ item }) => {
      const selected = selectedId === item.id;
      const subtitle = patientListSubtitle(item);
      return (
        <Pressable
          onPress={() => handlePick(item.id)}
          accessibilityRole="button"
          accessibilityState={{ selected }}
        >
          <Cluster
            style={[styles.row, selected && styles.rowSelected]}
            actions={
              <View style={styles.trailing}>
                {selected ? <Check size={iconSize.md} color={c.primary} strokeWidth={2.5} /> : null}
              </View>
            }
          >
            <View style={styles.rowBody}>
              <AppText style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
                {patientDisplayName(item)}
              </AppText>
              {subtitle ? (
                <AppText style={styles.meta} numberOfLines={1}>{subtitle}</AppText>
              ) : null}
            </View>
          </Cluster>
        </Pressable>
      );
    },
    [c.primary, handlePick, selectedId, styles],
  );

  const footer = isFetchingNextPage ? (
    <View style={styles.footerLoader}>
      <ActivityIndicator size="small" color={c.primary} />
    </View>
  ) : null;

  const countLabel = query.trim()
    ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`
    : `${resolvedTotal} patient${resolvedTotal > 1 ? 's' : ''}`;

  return (
    <SheetModal
      visible={visible}
      onClose={handleClose}
      title="Choisir un patient"
      subtitle={countLabel}
      contentStyle={styles.sheetBody}
      disableScroll
    >
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          leftIcon={<Search size={iconSize.sm} color={c.textTertiary} strokeWidth={2} />}
          autoCorrect={false}
        />
      </View>

      <View style={styles.listPanel}>
        {initialLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : filtered.length === 0 ? (
          <AppText style={styles.empty}>
            {query.trim() ? `Aucun résultat pour « ${query.trim()} »` : 'Aucun patient'}
          </AppText>
        ) : (
          <FlashList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            drawDistance={ROW_DRAW_DISTANCE}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={ListSeparator}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) onLoadMore?.();
            }}
            onEndReachedThreshold={0.4}
            nestedScrollEnabled
            ListFooterComponent={footer}
          />
        )}
      </View>
    </SheetModal>
  );
}

function buildSeparatorStyles({ colors: c }: Theme) {
  return {
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
    },
  };
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    sheetBody: {
      minWidth: 0,
      padding: 0,
      gap: 0,
    },
    searchWrap: {
      paddingHorizontal: H_PAD,
      paddingBottom: spacing[2],
    },
    listPanel: {
      alignSelf: 'stretch' as const,
      width: '100%' as const,
      height: LIST_MAX_HEIGHT,
      maxHeight: LIST_MAX_HEIGHT,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.surface,
      overflow: 'hidden' as const,
    },
    row: {
      paddingVertical: spacing[3],
      paddingHorizontal: H_PAD,
    },
    rowSelected: { backgroundColor: c.primaryLight },
    rowBody: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    name: {
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    nameSelected: { color: c.primaryDark },
    meta: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    trailing: { minWidth: 28, alignItems: 'center' as const, justifyContent: 'center' as const },
    empty: {
      ...font.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
      textAlign: 'center' as const,
      paddingVertical: spacing[6],
      paddingHorizontal: H_PAD,
    },
    centered: { paddingVertical: spacing[8], alignItems: 'center' as const },
    footerLoader: { paddingVertical: spacing[3], alignItems: 'center' as const },
  };
}
