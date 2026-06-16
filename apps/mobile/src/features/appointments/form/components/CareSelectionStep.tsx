import type { AppColors } from '@/theme/colors';
import { useThemedStyles } from '@/theme/use-themed-styles';
import { useAppColors } from '@/theme/use-app-colors';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Row } from '@/components/layout/primitives';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  careCategoryEmojiForCategory,
  isCareCategoryWithoutBookingOptions,
  type SelectedServiceInput,
} from '@oneandlab/shared-utils';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { useAppPreferencesStore } from '@/store/app-preferences-store';
import type { BookingServiceFormSlice } from '../utils/booking-service-form-slice';
import {
  buildCareFilterTabs,
  buildCareTileOrbColorMap,
  careListHeading,
  careTileEmojiOrbColor,
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
import {
  buildTabSceneScrollConfig,
  spreadTabSceneScrollProps,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const H_PAD = spacing[4];
/** Hauteur pill CTA flottant (étape 1). */
const PREMIUM_CTA_HEIGHT = 58;
const TILE_EMOJI_ORB = 52;
const LIST_GAP = spacing[2.5];

interface Props {
  nursingCategories: CareCategory[];
  bloodCategories: CareCategory[];
  allCategories: CareCategory[];
  selectedServices: SelectedServiceInput[];
  onlyCategoryOptionsFor: (cat: CareCategory) => boolean;
  onQuickAdd: (payload: { service: SelectedServiceInput; slice: BookingServiceFormSlice }) => void;
  onRemove: (serviceId: string) => void;
  onContinue: () => void;
  onEnsureCategoryReady?: (cat: CareCategory) => Promise<CareCategory>;
  formDataByService?: Record<string, BookingServiceFormSlice | undefined>;
  loading?: boolean;
  /** Estimation du nombre d’étapes après validation (min. 3). */
  progressTotal?: number;
}

function CareEmojiOrb({
  emoji,
  backgroundColor,
  size,
}: {
  emoji: string;
  backgroundColor: string;
  size: number;
}) {
  const styles = useThemedStyles(buildStyles, 'CareSelectionStep.CareEmojiOrb');
  const glyphSize = Math.round(size * 0.46);
  return (
    <View
      style={[
        styles.emojiOrb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        },
      ]}
    >
      <Text
        style={[styles.emojiOrbGlyph, { fontSize: glyphSize, lineHeight: glyphSize + 2 }]}
        accessibilityElementsHidden
      >
        {emoji}
      </Text>
    </View>
  );
}

function CareListTile({
  cat,
  orbColor,
  selected,
  hint,
  onPress,
}: {
  cat: CareCategory;
  orbColor: string;
  selected: boolean;
  hint?: string;
  onPress: () => void;
}) {
  const c = useAppColors();
  const styles = useThemedStyles(buildStyles, 'CareSelectionStep.CareListTile');
  const emoji =
    careCategoryEmojiForCategory({ name: cat.name, icon: cat.icon, type: cat.type }) || '➕';

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
        {selected ? (
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        ) : null}

        <CareEmojiOrb emoji={emoji} backgroundColor={orbColor} size={TILE_EMOJI_ORB} />

        <View style={styles.tileCopy}>
          <Text
            style={[styles.tileLabel, selected && styles.tileLabelSelected]}
            numberOfLines={2}
          >
            {cat.label}
          </Text>
          {hint ? <Text style={styles.tileHint}>{hint}</Text> : null}
        </View>

        <View
          style={[
            styles.tileAction,
            selected ? styles.tileActionSelected : styles.tileActionIdle,
          ]}
          pointerEvents="none"
        >
          {selected ? (
            <Check size={18} color={c.textInverse} strokeWidth={3} />
          ) : (
            <Plus size={18} color={c.primary} strokeWidth={2.75} />
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
  onlyCategoryOptionsFor,
  onQuickAdd,
  onRemove,
  onContinue,
  onEnsureCategoryReady,
  formDataByService,
  loading,
  progressTotal = 3,
}: Props) {
  const styles = useThemedStyles(buildStyles, 'features_appointments_form_components_CareSelectionStep_tsx_styles');
  const { show: toast } = useToast();
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const [modalCat, setModalCat] = useState<CareCategory | null>(null);
  const [modalOnlyOpts, setModalOnlyOpts] = useState(false);
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

  const colorblindType = useAppPreferencesStore((s) => s.colorblindType);

  const fullList = useMemo(
    () => [...nursingCategories, ...bloodCategories],
    [nursingCategories, bloodCategories],
  );

  const tileOrbColorMap = useMemo(
    () => buildCareTileOrbColorMap(fullList),
    [fullList, colorblindType],
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

  const floatingCtaBottom = Math.max(insets.bottom, spacing[2]) + spacing[3];
  const scrollBottomPad = hasSelection
    ? PREMIUM_CTA_HEIGHT + spacing[4] + floatingCtaBottom
    : spacing[3];

  const sceneInsets = useTabSceneInsets();
  const scrollConfig = buildTabSceneScrollConfig(sceneInsets, [
    styles.listContent,
    { paddingBottom: scrollBottomPad },
  ]);

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

      const skipOptionsSheet = isCareCategoryWithoutBookingOptions(cat);
      const quickAddWithoutSheet =
        skipOptionsSheet ||
        (onlyCategoryOptionsFor(cat) && (cat.options?.length ?? 0) === 0);

      if (!quickAddWithoutSheet) {
        setModalCat(cat);
        setModalOnlyOpts(onlyCategoryOptionsFor(cat));
      }

      try {
        const ready = onEnsureCategoryReady ? await onEnsureCategoryReady(cat) : cat;
        if (session !== optionsSheetSessionRef.current) return;

        const skipReady = isCareCategoryWithoutBookingOptions(ready);
        const addonOnly = onlyCategoryOptionsFor(ready);
        const optsLen = ready.options?.length ?? 0;
        if (skipReady || (addonOnly && optsLen === 0)) {
          setModalCat(null);
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
      onlyCategoryOptionsFor,
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
          total={progressTotal}
          label="Choix des soins"
        />

        {filterTabs.length > 0 ? (
          <CareCategoryFilterBar
            tabs={filterTabs}
            value={filterTab}
            onChange={setFilterTab}
          />
        ) : null}

        <Row gap={spacing[3]} align="start" justify="between">
          <View style={styles.metaCopy}>
            <Text style={styles.metaTitle}>{careListHeading(filterTab, filterTabs)}</Text>
            <Text style={styles.metaSubtitle}>
              {hasSelection
                ? `${selectionCount} sélectionné${selectionCount > 1 ? 's' : ''} — touchez à nouveau pour retirer`
                : 'Choisissez un ou plusieurs soins ci-dessous'}
            </Text>
          </View>
          <Row gap={spacing[1]} align="baseline" style={styles.metaCountPill}>
            <Text style={styles.metaCount}>{displayList.length}</Text>
            <Text style={styles.metaCountLabel}>
              {displayList.length > 1 ? 'soins' : 'soin'}
            </Text>
          </Row>
        </Row>
      </View>
    ),
    [
      displayList.length,
      filterTab,
      filterTabs,
      hasSelection,
      progressTotal,
      selectionCount,
    ],
  );

  const listBody = useMemo(() => {
    if (gridItems.length === 0) {
      return (
        <Text style={styles.emptyList}>
          {filterTab === 'all'
            ? 'Aucun soin disponible pour le moment.'
            : 'Aucun soin dans cette catégorie.'}
        </Text>
      );
    }
    return (
      <View style={styles.list}>
        {gridItems.map((cat) => (
          <CareListTile
            key={cat.id}
            cat={cat}
            orbColor={careTileEmojiOrbColor(cat, tileOrbColorMap)}
            selected={isSelected(cat.id)}
            onPress={() => void attemptAdd(cat)}
          />
        ))}
      </View>
    );
  }, [attemptAdd, filterTab, gridItems, isSelected, tileOrbColorMap]);

  const autreFooter = useMemo(() => {
    if (autreItems.length === 0) return null;
    return (
      <View style={styles.autreBlock}>
        <Text style={styles.autreKicker}>Besoin d’un autre soin ?</Text>
        {autreItems.map((cat) => (
          <CareListTile
            key={cat.id}
            cat={cat}
            orbColor={careTileEmojiOrbColor(cat, tileOrbColorMap)}
            selected={isSelected(cat.id)}
            hint="Soin non listé ci-dessus"
            onPress={() => void attemptAdd(cat)}
          />
        ))}
      </View>
    );
  }, [autreItems, attemptAdd, isSelected, tileOrbColorMap]);

  return (
    <>
      <View style={styles.root}>
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={scrollConfig.contentContainerStyle}
          {...spreadTabSceneScrollProps(scrollConfig)}
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
        onlyCategoryOptions={modalOnlyOpts}
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

function buildStyles(c: AppColors) {
  return {
  root: {
    minWidth: 0,
    flex: 1,
    minHeight: 0,
    backgroundColor: c.bookingCanvas,
  },
  listScroll: {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.bookingCanvas,
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
    flex: 1,
    minWidth: 0,
    gap: spacing[1],
  },
  metaTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    color: c.textPrimary,
    letterSpacing: -0.35,
    lineHeight: fontSize.lg * 1.15,
  },
  metaSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.4,
  },
  metaCountPill: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    flexShrink: 0,
  },
  metaCount: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
  },
  metaCountLabel: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: c.textTertiary,
  },
  list: {
    gap: LIST_GAP,
    width: '100%' as const,
  },
  tileHit: {
    width: '100%' as const,
  },
  tilePressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  tile: {
    minWidth: 0,
    width: '100%' as const,
    minHeight: 88,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],
    borderRadius: radius.xl,
    overflow: 'hidden' as const,
  },
  tileDefault: {
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surface,
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: c.primary,
    backgroundColor: c.primaryMid,
  },
  tileCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing[0.5],
    justifyContent: 'center' as const,
  },
  tileLabel: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: c.textPrimary,
    letterSpacing: -0.2,
    lineHeight: fontSize.base * 1.25,
  },
  tileLabelSelected: {
    color: c.primaryDark,
  },
  tileHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    lineHeight: fontSize.sm * 1.35,
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
    backgroundColor: c.primaryLight,
    borderWidth: 1.5,
    borderColor: c.primaryMid,
  },
  tileActionSelected: {
    backgroundColor: c.primary,
  },
  emojiOrb: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexShrink: 0,
  },
  emojiOrbGlyph: {
    textAlign: 'center' as const,
  },
  autreBlock: {
    marginTop: spacing[4],
    gap: LIST_GAP,
    paddingTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  },
  autreKicker: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.sm,
    color: c.textSecondary,
    letterSpacing: 0.2,
  },
  emptyList: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    color: c.textTertiary,
    textAlign: 'center' as const,
    paddingVertical: spacing[10],
  },
};
}

