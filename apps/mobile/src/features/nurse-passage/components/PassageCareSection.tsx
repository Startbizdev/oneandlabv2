import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, X } from 'lucide-react-native';
import {
  isCareCategoryWithoutBookingOptions,
  type SelectedServiceInput,
} from '@oneandlab/shared-utils';
import type { NursePassageNursingItem } from '@oneandlab/shared-types';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonList } from '@/components/ui/skeletons';
import {
  fetchCareCategories,
  fetchCareCategoryOptions,
  type CareCategory,
} from '@/features/categories/api/categories.service';
import { CareIcon } from '@/features/categories/components/CareIcon';
import { CareServiceQuickOptionsSheet } from '@/features/appointments/form/components/CareServiceQuickOptionsSheet';
import type { BookingServiceFormSlice } from '@/features/appointments/form/utils/booking-service-form-slice';
import { queryKeys } from '@/lib/query-keys';
import { hexToRgba } from '@/theme/color-utils';
import { layoutRowBetween, layoutRowCenter } from '@/theme/layout-styles';
import { useAppColors } from '@/theme/use-app-colors';
import {
  ICON_STROKE_WIDTH,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  iconSize,
  AppText,
  useStyles,
  type Theme,
} from '@/theme';
import {
  buildPassageNursingItemLabel,
  formatPassageNursingItemLabel,
} from '../utils/passage-nursing-item-label';

type Props = {
  items: NursePassageNursingItem[];
  onChange: (items: NursePassageNursingItem[]) => void;
  /** Feuille parente ouverte : réinitialise la vue d'ajout. */
  sheetOpen: boolean;
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

/** Sélection des soins d'un passage, affichée dans la feuille parente. */
export function PassageCareSection({ items, onChange, sheetOpen, onUiPhaseChange }: Props) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);
  const qc = useQueryClient();
  const [addingMore, setAddingMore] = useState(false);
  const [optionsCat, setOptionsCat] = useState<CareCategory | null>(null);

  const categoriesQ = useQuery({
    queryKey: queryKeys.categories.list('nursing', 'picker'),
    queryFn: async () => {
      const res = await fetchCareCategories('nursing', 'picker');
      return res.data ?? [];
    },
  });

  const categories = categoriesQ.data ?? [];

  useEffect(() => {
    if (sheetOpen) setAddingMore(false);
  }, [sheetOpen]);

  const showOptions = optionsCat != null;
  const showPicker = !showOptions && (items.length === 0 || addingMore);

  useEffect(() => {
    if (!onUiPhaseChange) return;
    if (showOptions) {
      onUiPhaseChange('options', { categoryName: optionsCat?.name ?? undefined });
      return;
    }
    onUiPhaseChange(showPicker ? 'picker' : 'selected');
  }, [onUiPhaseChange, showOptions, showPicker, optionsCat?.name]);

  const closeOptions = useCallback(() => setOptionsCat(null), []);

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
        setAddingMore(false);
        return;
      }
      setOptionsCat(ready);
    },
    [addItem, ensureCategoryReady, selectedIds],
  );

  const handleOptionsConfirm = useCallback(
    (payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }) => {
      if (!optionsCat) return;
      addItem(toNursingItem(payload.service, payload.slice, optionsCat));
      setOptionsCat(null);
      setAddingMore(false);
    },
    [addItem, optionsCat],
  );

  const backLink = (onPress: () => void, label: string) => (
    <Pressable onPress={onPress} style={styles.backLink} accessibilityRole="button" accessibilityLabel={label}>
      <ChevronLeft size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />
      <AppText variant="secondary" style={styles.backLinkText}>
        Retour
      </AppText>
    </Pressable>
  );

  if (showOptions && optionsCat) {
    return (
      <View>
        {backLink(closeOptions, 'Retour à la liste des soins')}
        <CareServiceQuickOptionsSheet
          embedded
          visible
          category={optionsCat}
          categories={categories}
          onlyCategoryOptions
          confirmLabel="Ajouter"
          onClose={closeOptions}
          onConfirm={handleOptionsConfirm}
        />
      </View>
    );
  }

  if (showPicker) {
    return (
      <View>
        {items.length > 0 ? backLink(() => setAddingMore(false), 'Retour aux soins sélectionnés') : null}
        {categoriesQ.isLoading ? (
          <SkeletonList count={5} itemHeight={52} gap={spacing[2]} />
        ) : categoriesQ.isError ? (
          <ErrorState title="Soins indisponibles" error={categoriesQ.error} onRetry={() => void categoriesQ.refetch()} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.pickerList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {categories.map((cat) => {
              const taken = selectedIds.has(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => void handlePickCategory(cat)}
                  disabled={taken}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: taken }}
                  style={[styles.pickerRow, taken ? styles.pickerRowTaken : null]}
                >
                  <CareIcon care={cat} variant="well" />
                  <AppText style={styles.pickerLabel}>{cat.name}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={styles.selected}>
      {items.map((item) => {
        const label = formatPassageNursingItemLabel(item, categories);
        return (
          <View key={item.category_id} style={styles.careRow}>
            <AppText style={styles.careName}>{label}</AppText>
            <Pressable
              onPress={() => removeItem(item.category_id)}
              style={styles.removeBtn}
              accessibilityRole="button"
              accessibilityLabel={`Retirer ${label}`}
            >
              <X size={iconSize.md} color={c.textSecondary} strokeWidth={ICON_STROKE_WIDTH} />
            </Pressable>
          </View>
        );
      })}

      <Button
        title="Ajouter un soin"
        variant="secondary"
        leftIcon={<Plus size={iconSize.md} color={c.primary} strokeWidth={ICON_STROKE_WIDTH} />}
        onPress={() => setAddingMore(true)}
      />
    </View>
  );
}

function buildStyles({ colors: c, font }: Theme) {
  return {
    selected: { gap: spacing[2] },
    careRow: {
      ...layoutRowBetween(spacing[2]),
      borderWidth: 1,
      borderColor: c.primary,
      backgroundColor: hexToRgba(c.primary, 0.08),
      borderRadius: radius.lg,
      paddingLeft: spacing[3],
      paddingVertical: spacing[1],
    },
    careName: { flex: 1, minWidth: 0, ...font.medium },
    removeBtn: {
      minWidth: MIN_TOUCH_TARGET,
      minHeight: MIN_TOUCH_TARGET,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    backLink: {
      ...layoutRowCenter(spacing[1]),
      minHeight: MIN_TOUCH_TARGET,
      alignSelf: 'flex-start' as const,
      marginBottom: spacing[1],
    },
    backLinkText: { ...font.semiBold, color: c.primary },
    pickerList: { paddingBottom: spacing[4], gap: spacing[2] },
    pickerRow: {
      ...layoutRowCenter(spacing[3]),
      minHeight: MIN_TOUCH_TARGET,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing[3],
    },
    pickerRowTaken: { backgroundColor: c.surfaceAlt, opacity: 0.5 },
    pickerLabel: { minWidth: 0, flex: 1, ...font.medium },
  };
}
