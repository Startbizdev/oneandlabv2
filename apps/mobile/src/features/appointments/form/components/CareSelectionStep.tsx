import { CareIcon } from '@/features/categories/components/CareIcon';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Row } from '@/components/layout/primitives';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSceneBottomInset } from '@/navigation/use-scene-bottom-inset';
import { Check, Plus } from 'lucide-react-native';
import {
  isCareCategoryWithoutBookingOptions,
  defaultBookingSliceForCareCategory,
  type SelectedServiceInput,
} from '@oneandlab/shared-utils';
import type { CareCategory } from '@/features/categories/api/categories.service';
import type { BookingServiceFormSlice } from '../utils/booking-service-form-slice';
import {
  buildCareFilterTabs,
  filterCategoriesByTab,
  isAutreCareCategory,
  sortCareCategoriesWithAutreLast,
} from '../utils/booking-care-catalog';
import { BookingPremiumStepCta } from './BookingPremiumStepCta';
import { BookingWizardProgress } from './BookingWizardProgress';
import { CareCategoryFilterBar } from './CareCategoryFilterBar';
import { CareServiceQuickOptionsSheet } from './CareServiceQuickOptionsSheet';
import { SelectedServicesDetailSheet } from './SelectedServicesDetailSheet';
import { useToast } from '@/providers/ToastProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { ICON_STROKE_WIDTH, radius, spacing, iconSize, AppText, useStyles, font, type Theme } from '@/theme';

const H_PAD = spacing[4];
/** Hauteur pill CTA flottant (étape 1). */
const PREMIUM_CTA_HEIGHT = 58;
const LIST_GAP = spacing[2.5];

interface Props {
  nursingCategories: CareCategory[];
  bloodCategories: CareCategory[];
  allCategories: CareCategory[];
  selectedServices: SelectedServiceInput[];
  onQuickAdd: (payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }) => void;
  onRemove: (serviceId: string) => void;
  onContinue: () => void;
  onEnsureCategoryReady?: (cat: CareCategory) => Promise<CareCategory>;
  formDataByService?: Record<string, BookingServiceFormSlice | undefined>;
  loading?: boolean;
  /** Étapes du parcours pour la sélection courante (la sélection des soins est la première). */
  phases: readonly string[];
  /** Contexte de la réservation sous la progression (soignant présélectionné). */
  contextBanner?: ReactNode;
}

function CareListTile({
  cat,
  selected,
  hint,
  onPress,
}: {
  cat: CareCategory;
  selected: boolean;
  hint?: string;
  onPress: () => void;
}) {
  const c = useAppColors();
  const styles = useStyles(buildStyles);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={
        selected ? `${cat.label}, sélectionné` : `Ajouter ${cat.label}`
      }
      style={({ pressed }) => [styles.tileHit, pressed && styles.tilePressed]}
    >
      <Row gap={spacing[3]} align="center" style={[styles.tile, selected ? styles.tileSelected : styles.tileDefault]}>
        <CareIcon care={cat} variant="well" />

        <View style={styles.tileCopy}>
          <AppText style={styles.tileLabel}>{cat.label}</AppText>
          {hint ? <AppText variant="caption" style={styles.tileHint}>{hint}</AppText> : null}
        </View>

        <View
          style={[
            styles.tileAction,
            selected ? styles.tileActionSelected : styles.tileActionIdle,
          ]}
          pointerEvents="none"
        >
          {selected ? (
            <Check size={iconSize.md} color={c.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
          ) : (
            <Plus size={iconSize.md} color={c.textLink} strokeWidth={ICON_STROKE_WIDTH} />
          )}
        </View>
      </Row>
    </Pressable>
  );
}

export function CareSelectionStep({
  nursingCategories,
  bloodCategories,
  allCategories,
  selectedServices,
  onQuickAdd,
  onRemove,
  onContinue,
  onEnsureCategoryReady,
  formDataByService,
  loading,
  phases,
  contextBanner,
}: Props) {
  const styles = useStyles(buildStyles);
  const { show: toast } = useToast();
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const { footerPadding } = useSceneBottomInset();
  const [modalCat, setModalCat] = useState<CareCategory | null>(null);
  /** Invalide les `ensureCategoryReady` en cours après fermeture ou nouveau tap. */
  const optionsSheetSessionRef = useRef(0);
  const [filterTab, setFilterTab] = useState('all');

  const resetFilterAfterAdd = useCallback(() => {
    setFilterTab('all');
  }, []);

  const closeOptionsSheet = useCallback(() => {
    optionsSheetSessionRef.current += 1;
    setModalCat(null);
  }, []);

  const openServicesDetail = useCallback(() => {
    setDetailSheetOpen(true);
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
    () =>
      sortCareCategoriesWithAutreLast(filterCategoriesByTab(fullList, filterTab)),
    [fullList, filterTab],
  );

  const { gridItems, autreItems } = useMemo(() => {
    const autre: CareCategory[] = [];
    const main: CareCategory[] = [];
    for (const c of displayList) {
      if (isAutreCareCategory(c)) autre.push(c);
      else main.push(c);
    }
    return { gridItems: main, autreItems: autre };
  }, [displayList]);

  const selectionCount = selectedServices.length;
  const hasSelection = selectionCount > 0;

  const floatingCtaBottom = footerPadding + spacing[3];
  const scrollBottomPad = hasSelection
    ? PREMIUM_CTA_HEIGHT + spacing[4] + floatingCtaBottom
    : spacing[3];

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

      const session = ++optionsSheetSessionRef.current;

      if (!isCareCategoryWithoutBookingOptions(cat)) {
        setModalCat(cat);
      }

      try {
        const ready = onEnsureCategoryReady ? await onEnsureCategoryReady(cat) : cat;
        if (session !== optionsSheetSessionRef.current) return;

        if (isCareCategoryWithoutBookingOptions(ready)) {
          setModalCat(null);
          onQuickAdd({
            service: {
              id: ready.id,
              type: ready.type,
              name: ready.label,
              category_id: ready.id,
              icon: ready.icon ?? undefined,
              category_image_url: ready.image_url ?? null,
              ...(ready.skip_prescription_documents
                ? { skip_prescription_documents: true as const }
                : {}),
            },
            slice: defaultBookingSliceForCareCategory(ready),
          });
          resetFilterAfterAdd();
          return;
        }
        setModalCat(ready);
      } catch (e) {
        if (session !== optionsSheetSessionRef.current) return;
        const msg = e instanceof Error ? e.message : String(e);
        setModalCat(null);
        toast(msg || 'Impossible de charger ce soin', { type: 'error' });
      }
    },
    [
      isSelected,
      onQuickAdd,
      onRemove,
      onEnsureCategoryReady,
      resetFilterAfterAdd,
      toast,
    ],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <BookingWizardProgress
          current={1}
          total={phases.length}
          phases={phases}
          label={phases[0]}
        />

        {contextBanner}

        {filterTabs.length > 0 ? (
          <CareCategoryFilterBar
            tabs={filterTabs}
            value={filterTab}
            onChange={setFilterTab}
          />
        ) : null}

        {hasSelection ? (
          <AppText variant="secondary" style={styles.metaCopy}>
            Touchez un soin coché pour le retirer.
          </AppText>
        ) : null}
      </View>
    ),
    [
      contextBanner,
      filterTab,
      filterTabs,
      hasSelection,
      phases,
      styles,
    ],
  );

  const listBody = useMemo(() => {
    if (gridItems.length === 0) {
      return filterTab === 'all' ? (
        <EmptyState
          illustration="booking"
          title="Aucun soin disponible"
          description="Revenez un peu plus tard."
        />
      ) : (
        <EmptyState
          illustration="search"
          title="Aucun soin ici"
          description="Choisissez une autre catégorie."
          actionLabel="Voir tous les soins"
          onAction={() => setFilterTab('all')}
        />
      );
    }
    return (
      <View style={styles.list}>
        {gridItems.map((cat) => (
          <CareListTile
            key={cat.id}
            cat={cat}
            selected={isSelected(cat.id)}
            onPress={() => void attemptAdd(cat)}
          />
        ))}
      </View>
    );
  }, [attemptAdd, filterTab, gridItems, isSelected, styles]);

  const autreFooter = useMemo(() => {
    if (autreItems.length === 0) return null;
    return (
      <View style={styles.autreBlock}>
        <AppText variant="caption" style={styles.autreKicker} accessibilityRole="header">
          Besoin d’un autre soin ?
        </AppText>
        {autreItems.map((cat) => (
          <CareListTile
            key={cat.id}
            cat={cat}
            selected={isSelected(cat.id)}
            hint="Soin non listé ci-dessus"
            onPress={() => void attemptAdd(cat)}
          />
        ))}
      </View>
    );
  }, [autreItems, attemptAdd, isSelected, styles]);

  return (
    <>
      <View style={styles.root}>
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={[styles.listContent, { paddingBottom: scrollBottomPad }]}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {listHeader}
          {listBody}
          {autreFooter}
        </ScrollView>

        {hasSelection ? (
          <Animated.View
            entering={FadeInUp.duration(420).springify().damping(20).stiffness(260)}
            style={[styles.floatingCta, { bottom: floatingCtaBottom }]}
            pointerEvents="box-none"
          >
            <BookingPremiumStepCta
              selectionCount={selectionCount}
              onSelectionBadgePress={openServicesDetail}
              onPress={onContinue}
              loading={loading}
            />
          </Animated.View>
        ) : null}
      </View>

      <CareServiceQuickOptionsSheet
        visible={modalCat != null}
        category={modalCat}
        categories={allCategories}
        onlyCategoryOptions={false}
        onClose={closeOptionsSheet}
        onConfirm={(payload) => {
          optionsSheetSessionRef.current += 1;
          onQuickAdd(payload);
          setModalCat(null);
          resetFilterAfterAdd();
        }}
      />

      <SelectedServicesDetailSheet
        visible={detailSheetOpen}
        selectedServices={selectedServices}
        categories={allCategories}
        formDataByService={formDataByService}
        onClose={() => setDetailSheetOpen(false)}
        onRemove={onRemove}
      />

    </>
  );
}

function buildStyles({ colors: c, text }: Theme) {
  return {
  root: {
    minWidth: 0,
    flex: 1,
    minHeight: 0,
    backgroundColor: c.background,
  },
  listScroll: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
  },
  listContent: {
    minWidth: 0,
    paddingHorizontal: H_PAD,
    paddingTop: spacing[4],
    flexGrow: 1,
  },
  floatingCta: {
    position: 'absolute' as const,
    left: H_PAD,
    right: H_PAD,
    zIndex: 20,
  },
  listHeader: {
    gap: spacing[4],
    marginBottom: spacing[4],
  },
  metaCopy: {
    minWidth: 0,
  },
  list: {
    gap: LIST_GAP,
    width: '100%' as const,
  },
  tileHit: {
    width: '100%' as const,
  },
  tilePressed: {
    opacity: 0.85,
  },
  tile: {
    minWidth: 0,
    width: '100%' as const,
    minHeight: 64,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1.5,
    overflow: 'hidden' as const,
  },
  tileDefault: {
    borderColor: c.cardBorder,
    backgroundColor: c.surface,
  },
  tileSelected: {
    borderColor: c.primary,
    backgroundColor: c.primaryLight,
  },
  tileCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[0.5],
    justifyContent: 'center' as const,
  },
  tileLabel: {
    ...text.body,
    ...font.semiBold,
    color: c.textPrimary,
  },
  tileHint: {
    color: c.textSecondary,
  },
  tileAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  tileActionIdle: {
    borderWidth: 1.5,
    borderColor: c.border,
  },
  tileActionSelected: {
    backgroundColor: c.primary,
  },
  autreBlock: {
    marginTop: spacing[4],
    gap: LIST_GAP,
    paddingTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  autreKicker: {
    ...font.semiBold,
    color: c.textSecondary,
  },
};
}

