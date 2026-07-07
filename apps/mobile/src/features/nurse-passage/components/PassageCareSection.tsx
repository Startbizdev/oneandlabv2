import { layoutRowBetween, layoutRowCenter } from '@/theme/layout-styles';
import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react-native';
import {
  careCategoryEmojiForCategory,
  isCareCategoryWithoutBookingOptions,
  type SelectedServiceInput,
} from '@oneandlab/shared-utils';
import type { NursePassageNursingItem } from '@oneandlab/shared-types';
import {
  fetchCareCategories,
  fetchCareCategoryOptions,
  type CareCategory,
} from '@/features/categories/api/categories.service';
import { CareServiceQuickOptionsSheet } from '@/features/appointments/form/components/CareServiceQuickOptionsSheet';
import type { BookingServiceFormSlice } from '@/features/appointments/form/utils/booking-service-form-slice';
import {
  buildPassageNursingItemLabel,
  formatPassageNursingItemLabel,
} from '../utils/passage-nursing-item-label';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { queryKeys } from '@/lib/query-keys';
import { radius, spacing, iconSize, AppText } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

type Props = {
  items: NursePassageNursingItem[];
  onChange: (items: NursePassageNursingItem[]) => void;
  /** Dans un bottom sheet parent — liste inline, pas de second sheet. */
  embedded?: boolean;
  /** Sheet parent ouvert (reset vue ajout). */
  sheetOpen?: boolean;
  onUiPhaseChange?: (
    phase: 'picker' | 'options' | 'selected',
    meta?: { categoryName?: string },
  ) => void;
};

function toNursingItem(
  service: SelectedServiceInput,
  slice: BookingServiceFormSlice,
  cat: CareCategory,
): NursePassageNursingItem {
  const careOptions = slice.care_options;
  const label = buildPassageNursingItemLabel(cat, careOptions);
  return {
    category_id: service.category_id ?? cat.id,
    label,
    ...(careOptions && Object.keys(careOptions).length > 0 ? { care_options: careOptions } : {}),
  };
}

export function PassageCareSection({ items, onChange, embedded, sheetOpen, onUiPhaseChange }: Props) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles);
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addingMore, setAddingMore] = useState(false);
  const [optionsCat, setOptionsCat] = useState<CareCategory | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(false);

  const categoriesQ = useQuery({
    queryKey: queryKeys.categories.list('nursing', 'picker'),
    queryFn: async () => {
      const res = await fetchCareCategories('nursing', 'picker');
      return res.data ?? [];
    },
  });

  const categories = categoriesQ.data ?? [];

  useEffect(() => {
    if (embedded && sheetOpen) setAddingMore(false);
  }, [embedded, sheetOpen]);

  const showInlineOptions = embedded && optionsVisible && optionsCat != null;
  const showInlinePicker = embedded && !showInlineOptions && (items.length === 0 || addingMore);

  useEffect(() => {
    if (!embedded || !onUiPhaseChange) return;
    if (showInlineOptions) {
      onUiPhaseChange('options', { categoryName: optionsCat?.name ?? undefined });
      return;
    }
    if (showInlinePicker) {
      onUiPhaseChange('picker');
      return;
    }
    onUiPhaseChange('selected');
  }, [
    embedded,
    onUiPhaseChange,
    showInlineOptions,
    showInlinePicker,
    optionsCat?.name,
  ]);

  const closeInlineOptions = useCallback(() => {
    setOptionsVisible(false);
    setOptionsCat(null);
  }, []);

  const selectedIds = useMemo(() => new Set(items.map((i) => i.category_id)), [items]);

  const ensureCategoryReady = useCallback(
    async (cat: CareCategory): Promise<CareCategory> => {
      if ((cat.options?.length ?? 0) > 0) return cat;
      const res = await fetchCareCategoryOptions(cat.id);
      const options = res.data ?? [];
      const patchList = (prev: CareCategory[] | undefined) =>
        (prev ?? []).map((x) => (x.id === cat.id ? { ...x, options } : x));
      qc.setQueryData(queryKeys.categories.list('nursing', 'picker'), patchList);
      return { ...cat, options };
    },
    [qc],
  );

  const addItem = useCallback(
    (item: NursePassageNursingItem) => {
      if (selectedIds.has(item.category_id)) return;
      onChange([...items, item]);
    },
    [items, onChange, selectedIds],
  );

  const removeItem = useCallback(
    (categoryId: string) => {
      onChange(items.filter((i) => i.category_id !== categoryId));
    },
    [items, onChange],
  );

  const handlePickCategory = useCallback(
    async (cat: CareCategory) => {
      if (selectedIds.has(cat.id)) return;
      const ready = await ensureCategoryReady(cat);
      const optionCount = ready.options?.length ?? 0;
      if (isCareCategoryWithoutBookingOptions(ready) || optionCount === 0) {
        addItem({ category_id: ready.id, label: ready.name });
        setPickerOpen(false);
        setAddingMore(false);
        return;
      }
      setOptionsCat(ready);
      setOptionsVisible(true);
    },
    [addItem, ensureCategoryReady, selectedIds],
  );

  const handleOptionsConfirm = useCallback(
    (payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }) => {
      if (!optionsCat) return;
      addItem(toNursingItem(payload.service, payload.slice, optionsCat));
      setOptionsVisible(false);
      setOptionsCat(null);
      setPickerOpen(false);
      setAddingMore(false);
    },
    [addItem, optionsCat],
  );

  const categoryList = (
    <ScrollView
      contentContainerStyle={styles.pickerList}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {categories.map((cat) => {
        const taken = selectedIds.has(cat.id);
        const emoji =
          careCategoryEmojiForCategory({ name: cat.name, icon: cat.icon, type: cat.type }) ||
          '💉';
        return (
          <Pressable
            key={cat.id}
            onPress={() => void handlePickCategory(cat)}
            disabled={taken}
            style={[
              styles.pickerRow,
              {
                borderColor: c.borderLight,
                backgroundColor: taken ? c.surfaceAlt : c.surface,
                opacity: taken ? 0.5 : 1,
              },
            ]}
          >
            <AppText style={styles.pickerEmoji}>{emoji}</AppText>
            <AppText style={[styles.pickerLabel, { color: c.textPrimary }]}>{cat.name}</AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <View>
      {!embedded ? (
        <AppText style={[styles.sectionLabel, { color: c.textTertiary }]}>Soins</AppText>
      ) : null}

      {showInlineOptions && optionsCat ? (
        <>
          <Pressable
            onPress={closeInlineOptions}
            hitSlop={8}
            style={styles.backLink}
            accessibilityRole="button"
            accessibilityLabel="Retour à la liste des soins"
          >
            <AppText style={[styles.backLinkText, { color: c.primary }]}>← Retour</AppText>
          </Pressable>
          <CareServiceQuickOptionsSheet
            embedded
            visible={optionsVisible}
            category={optionsCat}
            categories={categories}
            onlyCategoryOptions
            confirmLabel="Ajouter"
            onClose={closeInlineOptions}
            onConfirm={handleOptionsConfirm}
          />
        </>
      ) : showInlinePicker ? (
        <>
          {embedded && items.length > 0 ? (
            <Pressable
              onPress={() => setAddingMore(false)}
              hitSlop={8}
              style={styles.backLink}
              accessibilityRole="button"
              accessibilityLabel="Retour aux soins sélectionnés"
            >
              <AppText style={[styles.backLinkText, { color: c.primary }]}>← Retour</AppText>
            </Pressable>
          ) : null}
          {categoryList}
        </>
      ) : (
        <>
          {items.map((item) => (
            <View
              key={item.category_id}
              style={[
                styles.careRow,
                { borderColor: c.primary, backgroundColor: hexToRgba(c.primary, 0.08) },
              ]}
            >
              <View style={styles.careTextCol}>
                <AppText style={[styles.careName, { color: c.textPrimary }]} numberOfLines={2}>
                  {formatPassageNursingItemLabel(item, categories)}
                </AppText>
              </View>
              <Pressable
                onPress={() => removeItem(item.category_id)}
                hitSlop={8}
                accessibilityLabel="Retirer le soin"
              >
                <X size={iconSize.mdSm} color={c.textSecondary} />
              </Pressable>
            </View>
          ))}

          <Button
            title="Ajouter un soin"
            variant="secondary"
            leftIcon={<Plus size={iconSize.mdSm} color={c.primary} />}
            onPress={() => (embedded ? setAddingMore(true) : setPickerOpen(true))}
            style={styles.addBtn}
          />
        </>
      )}

      {!embedded ? (
        <BottomSheet
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title="Choisir un soin"
          snapPoints={['70%']}
          stackBehavior="push"
        >
          {categoryList}
        </BottomSheet>
      ) : null}

      {!embedded ? (
        <CareServiceQuickOptionsSheet
          visible={optionsVisible}
          category={optionsCat}
          categories={categories}
          onlyCategoryOptions
          onClose={closeInlineOptions}
          onConfirm={handleOptionsConfirm}
        />
      ) : null}
    </View>
  );
}

function buildStyles(_c: AppColors) {
  return {
    sectionLabel: {
      fontFamily: fontFamily.semiBold,
      fontSize: fontSize.xs,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
      marginBottom: spacing[2],
    },
    careRow: {
      ...layoutRowBetween(spacing[2]),
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing[3],
      marginBottom: spacing[2],
    },
    careTextCol: {
    minWidth: 0, flex: 1, gap: spacing[0.5] },
    careName: { fontFamily: fontFamily.medium, fontSize: fontSize.md },
    addBtn: { marginTop: spacing[1] },
    backLink: { marginBottom: spacing[2], alignSelf: 'flex-start' as const },
    backLinkText: { fontFamily: fontFamily.semiBold, fontSize: fontSize.sm },
    pickerList: { paddingBottom: spacing[4], gap: spacing[2] },
    pickerRow: {
      ...layoutRowCenter(spacing[3]),
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing[3],
    },
    pickerEmoji: { fontSize: fontSize['2xl'] },
    pickerLabel: {
    minWidth: 0, flex: 1, fontFamily: fontFamily.medium, fontSize: fontSize.md },
  };
}
