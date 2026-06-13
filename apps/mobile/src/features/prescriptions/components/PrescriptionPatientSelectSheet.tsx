import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItem,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Check } from 'lucide-react-native';
import { Cluster } from '@/components/layout/primitives';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { PatientRow } from '@/features/patients/api/fetch-all-patients';
import {
  patientDisplayName,
  patientListSubtitle,
  patientPickerOptionFromRow,
} from '@/features/patients/utils/patient-contact-display';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const H_PAD = spacing[4];
const LIST_MAX_HEIGHT = 420;
const ROW_DRAW_DISTANCE = 72 * 4;

function ListSeparator() {
  const styles = useThemedStyles(buildSeparatorStyles, 'PrescriptionPatientSelectSheet.separator');
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
  query: string;
  totalCount?: number;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function PrescriptionPatientSelectSheet({
  visible,
  onClose,
  patients,
  selectedId,
  onSelect,
  loading = false,
  query,
  totalCount,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionPatientSelectSheet');

  const filtered = useMemo(() => {
    if (!query.trim()) return patients;
    return patients.filter((p) => patientMatchesSearch(p, query));
  }, [patients, query]);

  const resolvedTotal = totalCount ?? patients.length;
  const initialLoading = loading && patients.length === 0;

  const handlePick = useCallback(
    (id: string) => {
      onSelect(id);
      onClose();
    },
    [onClose, onSelect],
  );

  const renderItem: ListRenderItem<PatientRow> = useCallback(
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
                {selected ? <Check size={20} color={c.primary} strokeWidth={2.5} /> : null}
              </View>
            }
          >
            <View style={styles.rowBody}>
              <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
                {patientDisplayName(item)}
              </Text>
              {subtitle ? (
                <Text style={styles.meta} numberOfLines={1}>{subtitle}</Text>
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

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Choisir un patient"
      subtitle={
        resolvedTotal > 0
          ? `${filtered.length} affiché(s) · ${resolvedTotal} patient(s) au total`
          : undefined
      }
      contentStyle={styles.sheetBody}
      disableScroll
      stackBehavior="push"
    >
      {initialLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>
          {query.trim() ? 'Aucun patient pour cette recherche' : 'Aucun patient'}
        </Text>
      ) : (
        <View style={styles.listPanel}>
          <FlashList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            estimatedItemSize={72}
            drawDistance={ROW_DRAW_DISTANCE}
            style={{ maxHeight: LIST_MAX_HEIGHT }}
            ItemSeparatorComponent={ListSeparator}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) onLoadMore?.();
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={footer}
          />
        </View>
      )}
    </BottomSheet>
  );
}

function buildSeparatorStyles(c: AppColors) {
  return {
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.borderLight,
      marginHorizontal: H_PAD,
    },
  };
}

function buildStyles(c: AppColors) {
  return {
    sheetBody: { paddingHorizontal: 0 },
    listPanel: { minHeight: 120 },
    row: {
      paddingVertical: spacing[3],
      paddingHorizontal: H_PAD,
    },
    rowSelected: { backgroundColor: c.primaryLight },
    rowBody: { flex: 1, minWidth: 0, gap: spacing[0.5] },
    name: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.base,
      color: c.textPrimary,
    },
    nameSelected: { color: c.primaryDark },
    meta: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    trailing: { minWidth: 28, alignItems: 'center' as const, justifyContent: 'center' as const },
    empty: {
      fontFamily: fontFamily.regular,
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
