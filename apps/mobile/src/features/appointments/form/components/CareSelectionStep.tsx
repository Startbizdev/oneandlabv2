import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Plus } from 'lucide-react-native';
import { careCategoryEmojiForCategory, type SelectedServiceInput } from '@oneandlab/shared-utils';
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
import { colors, elevation, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const EMOJI_TILE = 40;
const ACTION_SIZE = 32;

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
  onEnsureCategoryReady?: (cat: CareCategory) => Promise<CareCategory>;
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
  const emoji =
    careCategoryEmojiForCategory({ name: cat.name, icon: cat.icon, type: cat.type }) || '➕';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={
        selected ? `${cat.label}, ajouté — appuyer pour retirer` : `Ajouter ${cat.label}`
      }
      style={({ pressed }) => [styles.listItem, pressed && styles.listItemPressed]}
    >
      <View
        style={[
          styles.card,
          elevation.sm,
          selected ? styles.cardSelected : styles.cardDefault,
        ]}
      >
        <View style={[styles.emojiTile, selected && styles.emojiTileSelected]}>
          <Text style={styles.emoji} accessibilityElementsHidden>
            {emoji}
          </Text>
        </View>

        <Text
          style={[styles.label, selected && styles.labelSelected]}
          numberOfLines={1}
        >
          {cat.label}
        </Text>

        <View
          style={[
            styles.actionBtn,
            selected ? styles.actionBtnSelected : styles.actionBtnDefault,
          ]}
        >
          {selected ? (
            <Check size={15} color={colors.primaryDark} strokeWidth={2.5} />
          ) : (
            <Plus size={15} color={colors.primary} strokeWidth={2.5} />
          )}
        </View>
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
  onEnsureCategoryReady,
  loading,
}: Props) {
  const [modalCat, setModalCat] = useState<CareCategory | null>(null);
  const [modalOnlyOpts, setModalOnlyOpts] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
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
    async (cat: CareCategory) => {
      if (isSelected(cat.id)) {
        onRemove(cat.id);
        return;
      }
      const ready = onEnsureCategoryReady ? await onEnsureCategoryReady(cat) : cat;
      const addonOnly = onlyCategoryOptionsFor(ready);
      const optsLen = ready.options?.length ?? 0;
      if (addonOnly && optsLen === 0) {
        onQuickAdd({
          service: {
            id: ready.id,
            type: ready.type,
            name: ready.label,
            category_id: ready.id,
            ...(ready.skip_prescription_documents
              ? { skip_prescription_documents: true as const }
              : {}),
          },
          slice: {},
        });
        resetFilterAfterAdd();
        return;
      }
      setModalCat(ready);
      setModalOnlyOpts(addonOnly);
    },
    [isSelected, onQuickAdd, onRemove, onlyCategoryOptionsFor, onEnsureCategoryReady, resetFilterAfterAdd],
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
          ItemSeparatorComponent={ListSeparator}
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

function ListSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.surfaceAlt,
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
    letterSpacing: 0.6,
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
    letterSpacing: 0.6,
    marginTop: spacing[0.5],
  },
  listItem: {
    width: '100%',
  },
  listItemPressed: {
    opacity: 0.94,
  },
  card: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: spacing[2.5],
    paddingLeft: spacing[2.5],
    paddingRight: spacing[2],
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  cardDefault: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  cardSelected: {
    borderWidth: 1,
    borderColor: colors.primaryMid,
    backgroundColor: colors.primaryLight,
  },
  emojiTile: {
    width: EMOJI_TILE,
    height: EMOJI_TILE,
    marginRight: spacing[3],
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    flexShrink: 0,
  },
  emojiTileSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.primaryMid,
  },
  emoji: {
    fontSize: 22,
    lineHeight: 26,
    textAlign: 'center',
  },
  label: {
    flex: 1,
    flexShrink: 1,
    marginRight: spacing[2],
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  labelSelected: {
    color: colors.primaryDark,
  },
  actionBtn: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionBtnDefault: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryMid,
  },
  actionBtnSelected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  emptyList: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing[8],
  },
});
