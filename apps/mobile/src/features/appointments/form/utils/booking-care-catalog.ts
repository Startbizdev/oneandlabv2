import type { AppColors } from '@/theme/colors';
import type { Theme } from '@/theme/theme';
import { hexToRgba } from '@/theme/color-utils';
import {
  isAutreBookingCareCategory,
  isBloodTestAppointment,
  sortCareCategoriesForBooking,
} from '@oneandlab/shared-utils';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { palette } from '@/theme/colors';
import {
  DEFAULT_CATALOG_GROUP_THEME,
  STANDARD_CARE_TILE_ORB_COLORS,
  STANDARD_CATALOG_GROUP_THEMES,
  careTileFallbackOrbColor,
  type CatalogGroupTheme,
} from '@/theme/care-catalog-palette';

export type { CatalogGroupTheme } from '@/theme/care-catalog-palette';

/** Couleurs + mode daltonien : les pastilles standard Cary ne s'appliquent qu'hors mode daltonien. */
export type CarePaletteTheme = Pick<Theme, 'colors' | 'colorblindType'>;

export const CATALOG_GROUP_ORDER = [
  'examens',
  'soins',
  'suivi',
  'hygiene',
  'prevention',
  'divers',
] as const;

export type CatalogGroupKey = (typeof CATALOG_GROUP_ORDER)[number] | string;

export const CATALOG_GROUP_LABELS: Record<string, string> = {
  examens: 'Prélèvements',
  soins: 'Soins',
  suivi: 'Suivi',
  hygiene: 'Hygiène',
  prevention: 'Prévention',
  divers: 'Divers',
};

const NURSING_CATALOG_TAB_KEYS = ['soins', 'suivi', 'hygiene', 'prevention', 'divers'] as const;

export function resolveCatalogGroup(cat: CareCategory): string {
  const raw = cat.catalog_group?.trim().toLowerCase();
  if (raw) return raw;
  if (cat.type === 'blood_test') return 'examens';
  return 'divers';
}

function labelForUnknown(key: string): string {
  if (!key) return key;
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function catalogGroupLabel(key: string): string {
  return CATALOG_GROUP_LABELS[key] ?? labelForUnknown(key);
}

/** Emoji filtre segment (étape 1 mobile — aligné groupes catalogue). */
const CATALOG_GROUP_FILTER_EMOJI: Record<string, string> = {
  all: '✨',
  examens: '🧪',
  soins: '💗',
  suivi: '📊',
  hygiene: '🛁',
  prevention: '🛡️',
  divers: '📋',
};

export function catalogGroupFilterEmoji(key: string): string {
  return CATALOG_GROUP_FILTER_EMOJI[key] ?? '🏷️';
}

type AccentKey = 'primary' | 'success' | 'warning' | 'error';

function accentFromColors(c: AppColors, key: AccentKey) {
  switch (key) {
    case 'success':
      return {
        active: c.success,
        light: c.successLight,
        mid: c.successMid,
        dark: c.success,
      };
    case 'warning':
      return {
        active: c.warning,
        light: c.warningLight,
        mid: c.warningMid,
        dark: c.warning,
      };
    case 'error':
      return {
        active: c.error,
        light: c.errorLight,
        mid: c.errorMid,
        dark: c.error,
      };
    default:
      return {
        active: c.primary,
        light: c.primaryLight,
        mid: c.primaryMid,
        dark: c.primaryDark,
      };
  }
}

function buildThemeFromAccent(c: AppColors, accent: AccentKey): CatalogGroupTheme {
  const a = accentFromColors(c, accent);
  return {
    orb: a.mid,
    surface: c.surface,
    surfaceActive: a.mid,
    border: c.border,
    borderActive: a.active,
    label: c.textTertiary,
    labelActive: a.dark,
    gradient: [a.mid, a.active] as const,
    glow: hexToRgba(a.active, 0.22),
  };
}

/** Thèmes accessibilité — accents bien séparés, sans vert/rouge proches. */
function buildAccessibleCatalogThemes(c: AppColors): Record<string, CatalogGroupTheme> {
  return {
    all: buildThemeFromAccent(c, 'primary'),
    examens: buildThemeFromAccent(c, 'success'),
    soins: buildThemeFromAccent(c, 'warning'),
    suivi: buildThemeFromAccent(c, 'primary'),
    hygiene: buildThemeFromAccent(c, 'success'),
    prevention: buildThemeFromAccent(c, 'success'),
    divers: buildThemeFromAccent(c, 'error'),
  };
}

export function catalogGroupTheme(key: string, t: CarePaletteTheme): CatalogGroupTheme {
  const c = t.colors;
  if (t.colorblindType === 'off') {
    return STANDARD_CATALOG_GROUP_THEMES[key] ?? DEFAULT_CATALOG_GROUP_THEME;
  }
  const themes = buildAccessibleCatalogThemes(c);
  return themes[key] ?? buildThemeFromAccent(c, 'primary');
}

function careTileOrbPalette(t: CarePaletteTheme): readonly string[] {
  const c = t.colors;
  if (t.colorblindType === 'off') {
    return STANDARD_CARE_TILE_ORB_COLORS;
  }
  return [
    c.primaryLight,
    c.successLight,
    c.warningLight,
    c.errorLight,
    c.primaryMid,
    c.successMid,
    c.warningMid,
    c.errorMid,
    palette.slate[100],
    palette.slate[150],
    c.surfaceAlt,
    c.surfaceSubtle,
  ] as const;
}

export function careTileCategoryKey(cat: CareCategory): string {
  return String(cat.id ?? cat.name ?? cat.label ?? '');
}

function careTileOrbColorAtIndex(index: number, t: CarePaletteTheme): string {
  const paletteOrbs = careTileOrbPalette(t);
  if (index < paletteOrbs.length) {
    return paletteOrbs[index]!;
  }
  return careTileFallbackOrbColor(index);
}

/**
 * Une couleur unique par soin (ordre stable par id) — pas de collision hash.
 */
export function buildCareTileOrbColorMap(
  categories: CareCategory[],
  t: CarePaletteTheme,
): Map<string, string> {
  const byKey = new Map<string, CareCategory>();
  for (const cat of categories) {
    const key = careTileCategoryKey(cat);
    if (key && !byKey.has(key)) byKey.set(key, cat);
  }
  const sortedKeys = [...byKey.keys()].sort((a, b) => a.localeCompare(b));
  const map = new Map<string, string>();
  sortedKeys.forEach((key, index) => {
    map.set(key, careTileOrbColorAtIndex(index, t));
  });
  return map;
}

export function careTileEmojiOrbColor(
  cat: CareCategory,
  colorMap: ReadonlyMap<string, string>,
  t: CarePaletteTheme,
): string {
  const key = careTileCategoryKey(cat);
  return colorMap.get(key) ?? careTileOrbColorAtIndex(0, t);
}

function sortCatalogGroupKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const ia = CATALOG_GROUP_ORDER.indexOf(a as (typeof CATALOG_GROUP_ORDER)[number]);
    const ib = CATALOG_GROUP_ORDER.indexOf(b as (typeof CATALOG_GROUP_ORDER)[number]);
    const sa = ia === -1 ? 999 : ia;
    const sb = ib === -1 ? 999 : ib;
    if (sa !== sb) return sa - sb;
    return catalogGroupLabel(a).localeCompare(catalogGroupLabel(b), 'fr', {
      sensitivity: 'base',
    });
  });
}

export interface CareFilterTab {
  value: string;
  label: string;
}

/** Onglets filtre (Tous + segments présents dans le catalogue). */
export function buildCareFilterTabs(categories: CareCategory[]): CareFilterTab[] {
  const keys = new Set<string>();
  let hasBlood = false;
  let hasNursing = false;

  for (const cat of categories) {
    keys.add(resolveCatalogGroup(cat));
    if (cat.type === 'blood_test') hasBlood = true;
    if (cat.type === 'nursing') hasNursing = true;
  }

  if (hasBlood) keys.add('examens');
  if (hasNursing) {
    for (const g of NURSING_CATALOG_TAB_KEYS) keys.add(g);
  }

  const segmentKeys = sortCatalogGroupKeys([...keys]);
  if (segmentKeys.length <= 1) return [];

  return [
    { value: 'all', label: 'Tous' },
    ...segmentKeys.map((key) => ({ value: key, label: catalogGroupLabel(key) })),
  ];
}

export function filterCategoriesByTab(
  categories: CareCategory[],
  tab: string,
): CareCategory[] {
  if (tab === 'all') return categories;
  return categories.filter((c) => resolveCatalogGroup(c) === tab);
}

/** Catégorie fourre-tout « Autre » — toujours affichée en dernier à l’étape 1. */
export function isAutreCareCategory(cat: CareCategory): boolean {
  return isAutreBookingCareCategory(cat);
}

/** Ordre produit des soins à l’étape 1 (Pansements → Bilan prévention, Autre en dernier). */
export function sortCareCategoriesWithAutreLast(categories: CareCategory[]): CareCategory[] {
  return sortCareCategoriesForBooking(categories);
}

export function careListHeading(tab: string, tabs: CareFilterTab[]): string {
  if (tab === 'all') return 'Tous les soins';
  const found = tabs.find((t) => t.value === tab);
  return found?.label ?? 'Soins';
}

export type RdvCareTagColors = {
  backgroundColor: string;
  borderColor: string;
};

function stableLabelColorIndex(label: string): number {
  let h = 0;
  const s = label.trim().toLowerCase() || 'soin';
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

function findCategoryForRdvLine(
  line: { category_id: string | null; label: string },
  categories: CareCategory[],
): CareCategory | undefined {
  if (line.category_id != null) {
    const id = String(line.category_id);
    const byId = categories.find((c) => String(c.id) === id);
    if (byId) return byId;
  }
  const norm = line.label.trim().toLowerCase();
  if (!norm) return undefined;
  return categories.find((c) => c.name.trim().toLowerCase() === norm);
}

/** Fond + bordure mini-tag soin (liste RDV, offres). */
export function resolveRdvCareTagColors(
  line: { category_id: string | null; label: string },
  appointmentType: string,
  categories: CareCategory[],
  t: CarePaletteTheme,
  orbColorMap?: ReadonlyMap<string, string>,
): RdvCareTagColors {
  const c = t.colors;
  // Mode standard : pastilles Cary (teinte marque, fond plus marqué).
  if (t.colorblindType === 'off') {
    return {
      backgroundColor: c.primaryMid,
      borderColor: palette.brand[300],
    };
  }

  const map = orbColorMap ?? buildCareTileOrbColorMap(categories, t);
  const cat = findCategoryForRdvLine(line, categories);

  if (cat) {
    const theme = catalogGroupTheme(resolveCatalogGroup(cat), t);
    return {
      backgroundColor: careTileEmojiOrbColor(cat, map, t),
      borderColor: theme.border,
    };
  }

  if (isBloodTestAppointment(appointmentType)) {
    const theme = catalogGroupTheme('examens', t);
    return { backgroundColor: theme.orb, borderColor: theme.border };
  }

  const theme = catalogGroupTheme('divers', t);
  return {
    backgroundColor: careTileOrbColorAtIndex(stableLabelColorIndex(line.label), t),
    borderColor: theme.border,
  };
}
