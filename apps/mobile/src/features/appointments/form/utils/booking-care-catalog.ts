import type { CareCategory } from '@/features/categories/api/categories.service';

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

const DEFAULT_GROUP_THEME: CatalogGroupTheme = {
  orb: '#E8FBF9',
  surface: '#FFFFFF',
  surfaceActive: '#E8FBF9',
  border: '#E2E8F0',
  borderActive: '#1CC7B5',
  label: '#64748B',
  labelActive: '#0C6B61',
  gradient: ['#F0FDFB', '#D1F7F3'],
  glow: 'rgba(28, 199, 181, 0.22)',
};

const CATALOG_GROUP_THEMES: Record<string, CatalogGroupTheme> = {
  examens: {
    orb: '#CCFBF1',
    surface: '#F8FFFE',
    surfaceActive: '#ECFDF9',
    border: '#99F6E4',
    borderActive: '#0D9488',
    label: '#5B7A75',
    labelActive: '#0F766E',
    gradient: ['#F0FDFA', '#CCFBF1'],
    glow: 'rgba(13, 148, 136, 0.28)',
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
    glow: 'rgba(219, 39, 119, 0.22)',
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
    glow: 'rgba(37, 99, 235, 0.22)',
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
    glow: 'rgba(2, 132, 199, 0.22)',
  },
  prevention: {
    orb: '#DCFCE7',
    surface: '#FAFFFB',
    surfaceActive: '#F0FDF4',
    border: '#BBF7D0',
    borderActive: '#16A34A',
    label: '#5F7A68',
    labelActive: '#15803D',
    gradient: ['#F6FEF8', '#DCFCE7'],
    glow: 'rgba(22, 163, 74, 0.22)',
  },
  divers: {
    orb: '#FEF3C7',
    surface: '#FFFDF8',
    surfaceActive: '#FFFBEB',
    border: '#FDE68A',
    borderActive: '#D97706',
    label: '#8A7A5C',
    labelActive: '#B45309',
    gradient: ['#FFFBEB', '#FEF3C7'],
    glow: 'rgba(217, 119, 6, 0.2)',
  },
};

export function catalogGroupTheme(key: string): CatalogGroupTheme {
  return CATALOG_GROUP_THEMES[key] ?? DEFAULT_GROUP_THEME;
}

/** Pastels bien séparés visuellement (éviter plusieurs bleus/verts proches). */
const CARE_TILE_ORB_COLORS = [
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
  '#99F6E4',
  '#FECDD3',
] as const;

export function careTileCategoryKey(cat: CareCategory): string {
  return String(cat.id ?? cat.name ?? cat.label ?? '');
}

function careTileOrbColorAtIndex(index: number): string {
  if (index < CARE_TILE_ORB_COLORS.length) {
    return CARE_TILE_ORB_COLORS[index]!;
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

  /** Pas d’onglet « Tous » — valeur interne `all` = liste complète (aligné web IosSwipeSegmentFilter). */
  return segmentKeys.map((key) => ({ value: key, label: catalogGroupLabel(key) }));
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
  const label = (cat.label ?? '').trim().toLowerCase();
  const name = (cat.name ?? '').trim().toLowerCase();
  return label === 'autre' || name === 'autre' || /^autre\b/.test(label) || /^autre\b/.test(name);
}

export function sortCareCategoriesWithAutreLast(categories: CareCategory[]): CareCategory[] {
  const autre: CareCategory[] = [];
  const rest: CareCategory[] = [];
  for (const c of categories) {
    if (isAutreCareCategory(c)) autre.push(c);
    else rest.push(c);
  }
  return [...rest, ...autre];
}

export function careListHeading(tab: string, tabs: CareFilterTab[]): string {
  if (tab === 'all') return 'Tous les soins';
  const found = tabs.find((t) => t.value === tab);
  return found?.label ?? 'Soins';
}
