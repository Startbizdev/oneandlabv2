import type { AppColors } from '@/theme/colors';
import { hexToRgba } from '@/theme/color-utils';
import {
  isAutreBookingCareCategory,
  isBloodTestAppointment,
  sortCareCategoriesForBooking,
} from '@oneandlab/shared-utils';
import type { CareCategory } from '@/features/categories/api/categories.service';
import { getAppColors, getColorblindType, isColorblindModeEnabled, palette } from '@/theme/colors';

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

/** Palette visuelle par segment (filtres étape 1 booking). */
export type CatalogGroupTheme = {
  orb: string;
  surface: string;
  surfaceActive: string;
  border: string;
  borderActive: string;
  label: string;
  labelActive: string;
  gradient: readonly [string, string];
  glow: string;
};

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
    orb: a.light,
    surface: c.surface,
    surfaceActive: a.light,
    border: c.border,
    borderActive: a.active,
    label: c.textTertiary,
    labelActive: a.dark,
    gradient: [a.light, a.mid] as const,
    glow: hexToRgba(a.active, 0.22),
  };
}

const DEFAULT_GROUP_THEME: CatalogGroupTheme = {
  orb: palette.brand[50],
  surface: palette.white,
  surfaceActive: palette.brand[50],
  border: palette.slate[200],
  borderActive: palette.brand[500],
  label: palette.slate[500],
  labelActive: palette.brand[900],
  gradient: [palette.brand[50], palette.brand[100]],
  glow: hexToRgba(palette.brand[500], 0.22),
};

/** Thèmes marque d’origine (mode standard). */
const STANDARD_CATALOG_THEMES: Record<string, CatalogGroupTheme> = {
  all: {
    orb: palette.brand[50],
    surface: '#F8FFFE',
    surfaceActive: palette.brand[50],
    border: palette.brand[200],
    borderActive: palette.brand[500],
    label: '#5B7A75',
    labelActive: palette.brand[900],
    gradient: ['#F0FDFB', palette.brand[100]],
    glow: hexToRgba(palette.brand[500], 0.28),
  },
  examens: {
    orb: '#CCFBF1',
    surface: '#F8FFFE',
    surfaceActive: '#ECFDF9',
    border: palette.brand[200],
    borderActive: '#0D9488',
    label: '#5B7A75',
    labelActive: '#0F766E',
    gradient: ['#F0FDFA', '#CCFBF1'],
    glow: hexToRgba('#0D9488', 0.28),
  },
  soins: {
    orb: '#FCE7F3',
    surface: '#FFFBFC',
    surfaceActive: '#FFF1F5',
    border: '#FBCFE8',
    borderActive: '#DB2777',
    label: '#9D6B82',
    labelActive: '#9D174D',
    gradient: ['#FFF5F8', '#FCE7F3'],
    glow: hexToRgba('#DB2777', 0.22),
  },
  suivi: {
    orb: '#DBEAFE',
    surface: '#FAFCFF',
    surfaceActive: '#EFF6FF',
    border: '#BFDBFE',
    borderActive: '#2563EB',
    label: '#5C6F8A',
    labelActive: '#1D4ED8',
    gradient: ['#F5F9FF', '#DBEAFE'],
    glow: hexToRgba('#2563EB', 0.22),
  },
  hygiene: {
    orb: '#E0F2FE',
    surface: '#F8FCFF',
    surfaceActive: '#F0F9FF',
    border: '#BAE6FD',
    borderActive: '#0284C7',
    label: '#5C7A8F',
    labelActive: '#0369A1',
    gradient: ['#F0F9FF', '#E0F2FE'],
    glow: hexToRgba('#0284C7', 0.22),
  },
  prevention: {
    orb: palette.green[100],
    surface: '#FAFFFB',
    surfaceActive: palette.green[50],
    border: '#BBF7D0',
    borderActive: palette.green[600],
    label: '#5F7A68',
    labelActive: palette.green[700],
    gradient: ['#F6FEF8', palette.green[100]],
    glow: hexToRgba(palette.green[600], 0.22),
  },
  divers: {
    orb: palette.amber[100],
    surface: '#FFFDF8',
    surfaceActive: palette.amber[50],
    border: '#FDE68A',
    borderActive: palette.amber[600],
    label: '#8A7A5C',
    labelActive: palette.amber[700],
    gradient: [palette.amber[50], palette.amber[100]],
    glow: hexToRgba(palette.amber[600], 0.2),
  },
};

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

export function catalogGroupTheme(key: string): CatalogGroupTheme {
  if (!isColorblindModeEnabled()) {
    return STANDARD_CATALOG_THEMES[key] ?? DEFAULT_GROUP_THEME;
  }
  const themes = buildAccessibleCatalogThemes(getAppColors());
  return themes[key] ?? buildThemeFromAccent(getAppColors(), 'primary');
}

function careTileOrbPalette(c: AppColors): readonly string[] {
  if (!isColorblindModeEnabled()) {
    return [
      '#FCE7F3',
      '#DBEAFE',
      '#DCFCE7',
      '#FEF3C7',
      '#EDE9FE',
      '#FFEDD5',
      '#CFFAFE',
      '#FFE4E6',
      '#E0E7FF',
      '#FDE68A',
      '#FBCFE8',
      '#D1FAE5',
      '#FED7AA',
      '#F3E8FF',
      palette.brand[200],
      '#FECDD3',
    ] as const;
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

function careTileOrbColorAtIndex(index: number): string {
  const paletteOrbs = careTileOrbPalette(getAppColors());
  if (index < paletteOrbs.length) {
    return paletteOrbs[index]!;
  }
  const hue = (index * 41) % 360;
  return `hsl(${hue}, 52%, 90%)`;
}

/**
 * Une couleur unique par soin (ordre stable par id) — pas de collision hash.
 */
export function buildCareTileOrbColorMap(
  categories: CareCategory[],
): Map<string, string> {
  const byKey = new Map<string, CareCategory>();
  for (const cat of categories) {
    const key = careTileCategoryKey(cat);
    if (key && !byKey.has(key)) byKey.set(key, cat);
  }
  const sortedKeys = [...byKey.keys()].sort((a, b) => a.localeCompare(b));
  const map = new Map<string, string>();
  sortedKeys.forEach((key, index) => {
    map.set(key, careTileOrbColorAtIndex(index));
  });
  return map;
}

export function careTileEmojiOrbColor(
  cat: CareCategory,
  colorMap: ReadonlyMap<string, string>,
): string {
  const key = careTileCategoryKey(cat);
  return colorMap.get(key) ?? careTileOrbColorAtIndex(0);
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

/** Invalide les caches UI dépendants du thème catalogue (appeler après toggle). */
export function getCatalogThemeRevision(): string {
  return getColorblindType();
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
  orbColorMap?: ReadonlyMap<string, string>,
): RdvCareTagColors {
  const c = getAppColors();

  // Mode standard : pastilles turquoise Cary (comme avant le mode accessible).
  if (!isColorblindModeEnabled()) {
    return {
      backgroundColor: c.primaryLight,
      borderColor: c.primaryMid,
    };
  }

  const map = orbColorMap ?? buildCareTileOrbColorMap(categories);
  const cat = findCategoryForRdvLine(line, categories);

  if (cat) {
    const theme = catalogGroupTheme(resolveCatalogGroup(cat));
    return {
      backgroundColor: careTileEmojiOrbColor(cat, map),
      borderColor: theme.border,
    };
  }

  if (isBloodTestAppointment(appointmentType)) {
    const theme = catalogGroupTheme('examens');
    return { backgroundColor: theme.orb, borderColor: theme.border };
  }

  const theme = catalogGroupTheme('divers');
  return {
    backgroundColor: careTileOrbColorAtIndex(stableLabelColorIndex(line.label)),
    borderColor: theme.border,
  };
}
