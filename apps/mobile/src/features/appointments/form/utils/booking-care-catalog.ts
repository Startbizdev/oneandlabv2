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
