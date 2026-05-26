import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { careCategoryEmojiForCategory, type SelectedServiceInput } from '@oneandlab/shared-utils';
import type { CareCategory } from '@/features/categories/api/categories.service';
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
import { CareCategoryFilterBar } from './CareCategoryFilterBar';
import { CareServiceQuickOptionsSheet } from './CareServiceQuickOptionsSheet';
import { useToast } from '@/providers/ToastProvider';
import { colors, radius, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

const GRID_GAP = spacing[2];
const H_PAD = spacing[4];
/** Hauteur pill CTA flottant (étape 1). */
const PREMIUM_CTA_HEIGHT = 58;
const TILE_EMOJI_ORB = 38;
const TILE_EMOJI_ORB_WIDE = 46;

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
  loading?: boolean;
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
  const fontSize = Math.round(size * 0.46);
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
        style={[styles.emojiOrbGlyph, { fontSize, lineHeight: fontSize + 2 }]}
        accessibilityElementsHidden
      >
        {emoji}
      </Text>
    </View>
  );
}

function CareGridTile({
  cat,
  orbColor,
  selected,
  wide,
  onPress,
}: {
  cat: CareCategory;
  orbColor: string;
  selected: boolean;
  wide?: boolean;
  onPress: () => void;
}) {
  const emoji =
    careCategoryEmojiForCategory({ name: cat.name, icon: cat.icon, type: cat.type }) || '➕';
  const orbSize = wide ? TILE_EMOJI_ORB_WIDE : TILE_EMOJI_ORB;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={
        selected ? `${cat.label}, sélectionné` : `Ajouter ${cat.label}`
      }
      style={({ pressed }) => [
        styles.tileHit,
        wide && styles.tileHitWide,
        pressed && styles.tilePressed,
      ]}
    >
      <View
        style={[
          styles.tile,
          wide && styles.tileWide,
          selected ? styles.tileSelected : styles.tileDefault,
        ]}
      >
        {selected ? (
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        ) : null}

        {selected ? (
          <View style={styles.checkBadge} pointerEvents="none">
            <Check size={12} color={colors.textInverse} strokeWidth={3} />
          </View>
        ) : (
          <View style={styles.addBadge} pointerEvents="none">
            <Plus size={14} color={colors.primary} strokeWidth={2.75} />
          </View>
        )}

        {wide ? (
          <>
            <CareEmojiOrb emoji={emoji} backgroundColor={orbColor} size={orbSize} />
            <View style={styles.tileWideCopy}>
              <Text
                style={[styles.tileLabelWide, selected && styles.tileLabelSelected]}
                numberOfLines={2}
              >
                {cat.label}
              </Text>
              <Text style={styles.tileWideHint}>Soin non listé ci-dessus</Text>
            </View>
          </>
        ) : (
          <>
            <CareEmojiOrb emoji={emoji} backgroundColor={orbColor} size={orbSize} />
            <Text
              style={[styles.tileLabel, selected && styles.tileLabelSelected]}
              numberOfLines={3}
            >
              {cat.label}
            </Text>
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
  onlyCategoryOptionsFor,
  onQuickAdd,
  onRemove,
  onContinue,
  onEnsureCategoryReady,
  loading,
}: Props) {
  const { show: toast } = useToast();
  const { width: screenW } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [modalCat, setModalCat] = useState<CareCategory | null>(null);
  const [modalOnlyOpts, setModalOnlyOpts] = useState(false);
  /** Invalide les `ensureCategoryReady` en cours après fermeture ou nouveau tap. */
  const optionsSheetSessionRef = useRef(0);
  const [filterTab, setFilterTab] = useState('all');

  const tileWidth = useMemo(() => {
    const inner = screenW - H_PAD * 2;
    return Math.floor((inner - GRID_GAP) / 2);
  }, [screenW]);

  const resetFilterAfterAdd = useCallback(() => {
    setFilterTab('all');
  }, []);

  const closeOptionsSheet = useCallback(() => {
    optionsSheetSessionRef.current += 1;
    setModalCat(null);
  }, []);

  const fullList = useMemo(
    () => [...nursingCategories, ...bloodCategories],
    [nursingCategories, bloodCategories],
  );

  const tileOrbColorMap = useMemo(() => buildCareTileOrbColorMap(fullList), [fullList]);

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

      const quickAddWithoutSheet =
        onlyCategoryOptionsFor(cat) && (cat.options?.length ?? 0) === 0;

      if (!quickAddWithoutSheet) {
        setModalCat(cat);
        setModalOnlyOpts(onlyCategoryOptionsFor(cat));
      }

      try {
        const ready = onEnsureCategoryReady ? await onEnsureCategoryReady(cat) : cat;
        if (session !== optionsSheetSessionRef.current) return;

        const addonOnly = onlyCategoryOptionsFor(ready);
        const optsLen = ready.options?.length ?? 0;
        if (addonOnly && optsLen === 0) {
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
    [isSelected, onQuickAdd, onRemove, onlyCategoryOptionsFor, onEnsureCategoryReady, resetFilterAfterAdd, toast],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        {filterTabs.length > 0 ? (
          <CareCategoryFilterBar
            tabs={filterTabs}
            value={filterTab}
            onChange={setFilterTab}
          />
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.metaTitle}>{careListHeading(filterTab, filterTabs)}</Text>
          <Text style={styles.metaCount}>
            {displayList.length} {displayList.length > 1 ? 'soins' : 'soin'}
          </Text>
        </View>
      </View>
    ),
    [displayList.length, filterTab, filterTabs],
  );

  const gridBody = useMemo(() => {
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
      <View style={styles.grid}>
        {gridItems.map((cat) => (
          <View key={cat.id} style={[styles.gridCell, { width: tileWidth }]}>
            <CareGridTile
              cat={cat}
              orbColor={careTileEmojiOrbColor(cat, tileOrbColorMap)}
              selected={isSelected(cat.id)}
              onPress={() => void attemptAdd(cat)}
            />
          </View>
        ))}
      </View>
    );
  }, [attemptAdd, filterTab, gridItems, isSelected, tileOrbColorMap, tileWidth]);

  const autreFooter = useMemo(() => {
    if (autreItems.length === 0) return null;
    return (
      <View style={styles.autreBlock}>
        <Text style={styles.autreKicker}>Besoin d’un autre soin ?</Text>
        {autreItems.map((cat) => (
          <CareGridTile
            key={cat.id}
            cat={cat}
            orbColor={careTileEmojiOrbColor(cat, tileOrbColorMap)}
            selected={isSelected(cat.id)}
            wide
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
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: scrollBottomPad }]}
          contentInsetAdjustmentBehavior="automatic"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {listHeader}
          {gridBody}
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

    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    backgroundColor: colors.bookingCanvas,
  },
  list: {
    flex: 1,
    backgroundColor: colors.bookingCanvas,
  },
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: spacing[2],
    flexGrow: 1,
  },
  floatingCta: {
    position: 'absolute',
    left: H_PAD,
    right: H_PAD,
    zIndex: 20,
  },
  listHeader: {
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  metaTitle: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  metaCount: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: GRID_GAP,
    rowGap: GRID_GAP,
  },
  gridCell: {
    flexShrink: 0,
    flexGrow: 0,
  },
  tileHit: {
    width: '100%',
  },
  tileHitWide: {
    width: '100%',
  },
  tilePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  tile: {
    width: '100%',
    minHeight: 76,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1.5],
    overflow: 'hidden',
  },
  tileWide: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing[3],
    paddingHorizontal: spacing[4],
  },
  tileDefault: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tileSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryMid,
  },
  checkBadge: {
    position: 'absolute',
    top: spacing[1.5],
    right: spacing[1.5],
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  addBadge: {
    position: 'absolute',
    top: spacing[1.5],
    right: spacing[1.5],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  emojiOrb: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emojiOrbGlyph: {
    textAlign: 'center',
  },
  tileLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: fontSize.xs * 1.35,
  },
  tileLabelSelected: {
    color: colors.primaryDark,
  },
  tileWideCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  tileLabelWide: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    textAlign: 'left',
  },
  tileWideHint: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  autreBlock: {
    marginTop: spacing[2],
    gap: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  autreKicker: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize['2xs'],
    color: colors.textTertiary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  emptyList: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: colors.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing[8],
  },
});
