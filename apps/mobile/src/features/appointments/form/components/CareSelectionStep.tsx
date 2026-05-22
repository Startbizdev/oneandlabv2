import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import type { SelectedServiceInput } from '@oneandlab/shared-utils';
import type { CareCategory } from '@/features/categories/api/categories.service';
import type { BookingServiceFormSlice } from '../utils/booking-service-form-slice';
import {
  buildCareFilterTabs,
  careListHeading,
  filterCategoriesByTab,
} from '../utils/booking-care-catalog';
import { ScreenActionLayout } from '@/components/layout/ScreenActionLayout';
import { BookingActionBar } from './BookingActionBar';
import { CareCategoryFilterBar } from './CareCategoryFilterBar';
import { CareServiceQuickOptionsSheet } from './CareServiceQuickOptionsSheet';
import { SelectedServicesDetailSheet } from './SelectedServicesDetailSheet';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

interface Props {
  nursingCategories: CareCategory[];
  bloodCategories: CareCategory[];
  allCategories: CareCategory[];
  selectedServices: SelectedServiceInput[];
  formDataByService: Record<string, Record<string, unknown>>;
  onlyCategoryOptionsFor: (cat: CareCategory) => boolean;
  onQuickAdd: (payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }) => void;
  onRemove: (serviceId: string) => void;
  onContinue: () => void;
  loading?: boolean;
}

function CareRow({
  cat,
  selected,
  onPress,
}: {
  cat: CareCategory;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowLabel}>{cat.label}</Text>
        {cat.description ? (
          <Text style={styles.rowDesc} numberOfLines={2}>
            {cat.description}
          </Text>
        ) : null}
      </View>
      <View style={[styles.addChip, selected && styles.addChipSelected]}>
        {selected ? (
          <>
            <Check size={12} color={colors.primaryDark} strokeWidth={2.5} />
            <Text style={[styles.addChipText, styles.addChipTextSelected]}>Ajouté</Text>
          </>
        ) : (
          <>
            <Plus size={12} color={colors.primary} strokeWidth={2.5} />
            <Text style={styles.addChipText}>Ajouter</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

export function CareSelectionStep({
  nursingCategories,
  bloodCategories,
  allCategories,
  selectedServices,
  formDataByService,
  onlyCategoryOptionsFor,
  onQuickAdd,
  onRemove,
  onContinue,
  loading,
}: Props) {
  const [modalCat, setModalCat] = useState<CareCategory | null>(null);
  const [modalOnlyOpts, setModalOnlyOpts] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  /** `all` = aucun segment actif, liste complète (pas de puce « Tous »). */
  const [filterTab, setFilterTab] = useState('all');

  const resetFilterAfterAdd = useCallback(() => {
    setFilterTab('all');
  }, []);

  const fullList = useMemo(
    () => [...nursingCategories, ...bloodCategories],
    [nursingCategories, bloodCategories],
  );

  const filterTabs = useMemo(() => buildCareFilterTabs(fullList), [fullList]);

  useEffect(() => {
    if (filterTab === 'all') return;
    if (!filterTabs.some((t) => t.value === filterTab)) {
      setFilterTab('all');
    }
  }, [filterTab, filterTabs]);

  const displayList = useMemo(
    () => filterCategoriesByTab(fullList, filterTab),
    [fullList, filterTab],
  );

  const count = selectedServices.length;
  const hasSelection = count > 0;

  const isSelected = useCallback(
    (catId: string) => selectedServices.some((s) => s.id === catId),
    [selectedServices],
  );

  const attemptAdd = useCallback(
    (cat: CareCategory) => {
      if (isSelected(cat.id)) {
        onRemove(cat.id);
        return;
      }
      const addonOnly = onlyCategoryOptionsFor(cat);
      const optsLen = cat.options?.length ?? 0;
      if (addonOnly && optsLen === 0) {
        onQuickAdd({
          service: {
            id: cat.id,
            type: cat.type,
            name: cat.label,
            category_id: cat.id,
            ...(cat.skip_prescription_documents
              ? { skip_prescription_documents: true as const }
              : {}),
          },
          slice: {},
        });
        resetFilterAfterAdd();
        return;
      }
      setModalCat(cat);
      setModalOnlyOpts(addonOnly);
    },
    [isSelected, onQuickAdd, onRemove, onlyCategoryOptionsFor, resetFilterAfterAdd],
  );

  const formSlices = formDataByService as Record<string, BookingServiceFormSlice | undefined>;

  const renderItem = useCallback(
    ({ item }: { item: CareCategory }) => (
      <CareRow
        cat={item}
        selected={isSelected(item.id)}
        onPress={() => attemptAdd(item)}
      />
    ),
    [attemptAdd, isSelected],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        {filterTabs.length > 0 ? (
          <>
            <Text style={styles.filterKicker}>Par catégorie</Text>
            <CareCategoryFilterBar
              tabs={filterTabs}
              value={filterTab}
              onChange={setFilterTab}
            />
          </>
        ) : null}
        <Text style={styles.sectionHeading}>
          {careListHeading(filterTab, filterTabs)}
        </Text>
      </View>
    ),
    [filterTab, filterTabs],
  );

  const listEmpty = useMemo(
    () => (
      <Text style={styles.emptyList}>
        {filterTab === 'all'
          ? 'Aucun soin disponible pour le moment.'
          : 'Aucun soin dans cette catégorie.'}
      </Text>
    ),
    [filterTab],
  );

  const footer = hasSelection ? (
    <BookingActionBar
      cart={{ count, onPressDetail: () => setDetailOpen(true) }}
      primaryLabel="Continuer"
      onPrimary={onContinue}
      primaryLoading={loading}
    />
  ) : undefined;

  return (
    <>
      <ScreenActionLayout footer={footer} style={styles.root}>
        <FlatList
          data={displayList}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </ScreenActionLayout>

      <CareServiceQuickOptionsSheet
        visible={modalCat != null}
        category={modalCat}
        categories={allCategories}
        onlyCategoryOptions={modalOnlyOpts}
        onClose={() => setModalCat(null)}
        onConfirm={(payload) => {
          onQuickAdd(payload);
          setModalCat(null);
          resetFilterAfterAdd();
        }}
      />

      <SelectedServicesDetailSheet
        visible={detailOpen}
        selectedServices={selectedServices}
        categories={allCategories}
        formDataByService={formSlices}
        onClose={() => setDetailOpen(false)}
        onRemove={onRemove}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[4],
    flexGrow: 1,
  },
  listHeader: {
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  filterKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  separator: {
    height: spacing[2],
  },
  sectionHeading: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  rowMain: { flex: 1, gap: 2, minWidth: 0 },
  rowLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  rowDesc: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[2],
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryMid,
    backgroundColor: colors.primaryLight,
    flexShrink: 0,
  },
  addChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMid,
  },
  addChipText: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.primary,
  },
  addChipTextSelected: { color: colors.primaryDark },
  emptyList: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing[8],
  },
});
