import type { AppColors } from '@/theme/colors';
import { useAppColors } from '@/theme/use-app-colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Search } from 'lucide-react-native';
import type { Appointment } from '@oneandlab/shared-types';
import type { AppointmentListRow } from '@/utils/appointment-batch';
import { navigateAppointmentForListRow } from '@/utils/appointment-batch';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import {
  PrescriptionAppointmentPickerRow,
  appointmentPickerRowKey,
} from './PrescriptionAppointmentPickerRow';
import { prescriptionAppointmentMatchesSearch } from '../utils/prescription-display';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const H_PAD = spacing[4];
const LIST_MAX_HEIGHT = 400;
const ROW_DRAW_DISTANCE = 108 * 4;

function ListSeparator() {
  const styles = useThemedStyles(buildSeparatorStyles, 'PrescriptionAppointmentSelectSheet.separator');
  return <View style={styles.separator} />;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  rows: AppointmentListRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading?: boolean;
  totalCount?: number;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  searchPlaceholder?: string;
}

/** Bottom sheet — recherche intégrée + FlashList + infinite scroll. */
export function PrescriptionAppointmentSelectSheet({
  visible,
  onClose,
  rows,
  selectedId,
  onSelect,
  loading = false,
  totalCount,
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
  searchPlaceholder = 'Rechercher par date, créneau ou soin…',
}: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'PrescriptionAppointmentSelectSheet');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  const filteredRows = useMemo(() => {
    const q = query.trim();
    if (!q) return rows;
    return rows.filter((row) => {
      const apts: Appointment[] =
        row.kind === 'batch' ? row.appointments : [row.appointment];
      return apts.some((a) => prescriptionAppointmentMatchesSearch(a, q));
    });
  }, [rows, query]);

  const resolvedTotal = totalCount ?? rows.length;
  const initialLoading = loading && rows.length === 0;

  const handleClose = useCallback(() => {
    setQuery('');
    onClose();
  }, [onClose]);

  const handlePick = useCallback(
    (row: AppointmentListRow) => {
      onSelect(navigateAppointmentForListRow(row).id);
    },
    [onSelect],
  );

  const renderItem: ListRenderItem<AppointmentListRow> = useCallback(
    ({ item }) => (
      <PrescriptionAppointmentPickerRow
        row={item}
        selected={
          item.kind === 'batch'
            ? item.appointments.some((a) => a.id === selectedId)
            : item.appointment.id === selectedId
        }
        onPick={handlePick}
      />
    ),
    [handlePick, selectedId],
  );

  const keyExtractor = useCallback((row: AppointmentListRow) => appointmentPickerRowKey(row), []);

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || initialLoading) return;
    onLoadMore?.();
  }, [hasNextPage, initialLoading, isFetchingNextPage, onLoadMore]);

  const listFooter = useMemo(() => {
    if (!isFetchingNextPage) return <View style={styles.footerSpacer} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={c.primary} size="small" />
      </View>
    );
  }, [c.primary, isFetchingNextPage, styles.footerLoader, styles.footerSpacer]);

  const countLabel = query.trim()
    ? `${filteredRows.length} résultat${filteredRows.length > 1 ? 's' : ''}`
    : `${resolvedTotal} rendez-vous`;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Choisir un rendez-vous"
      subtitle={countLabel}
      stackBehavior="push"
      disableScroll
      contentStyle={styles.body}
    >
      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder}
          leftIcon={<Search size={16} color={c.textTertiary} strokeWidth={2} />}
          autoCorrect={false}
        />
      </View>

      {initialLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={c.primary} />
          <Text style={styles.centeredText}>Chargement…</Text>
        </View>
      ) : resolvedTotal === 0 && !query.trim() ? (
        <Text style={styles.empty}>
          Aucun rendez-vous pour ce patient. Créez-en un ou passez en mode « Sans RDV ».
        </Text>
      ) : filteredRows.length === 0 ? (
        <Text style={styles.empty}>
          {query.trim()
            ? `Aucun résultat pour « ${query.trim()} ».`
            : 'Aucun rendez-vous chargé.'}
        </Text>
      ) : (
        <View style={styles.listPanel}>
          <FlashList
            data={filteredRows}
            extraData={selectedId}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={ListSeparator}
            getItemType={(row) => (row.kind === 'batch' ? 'batch' : 'single')}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            drawDistance={ROW_DRAW_DISTANCE}
            onEndReached={loadMore}
            onEndReachedThreshold={0.35}
            nestedScrollEnabled
            ListFooterComponent={listFooter}
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
      backgroundColor: c.border,
    },
  };
}

function buildStyles(c: AppColors) {
  return {
    body: {
      minWidth: 0,
      padding: 0,
      gap: 0,
      paddingBottom: spacing[2],
      flexGrow: 1,
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
    footerLoader: {
      paddingVertical: spacing[3],
      alignItems: 'center' as const,
    },
    footerSpacer: {
      height: spacing[2],
    },
    centered: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingVertical: spacing[8],
      paddingHorizontal: H_PAD,
      gap: spacing[2],
    },
    centeredText: {
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textSecondary,
    },
    empty: {
      paddingHorizontal: H_PAD,
      paddingVertical: spacing[6],
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: c.textTertiary,
      textAlign: 'center' as const,
      lineHeight: fontSize.sm * 1.45,
    },
  };
}
