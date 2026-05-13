/**
 * Thèmes des segments « grandes catégories » (filtre RDV).
 * Style plat : pastel plein à la sélection, bordures grises neutres (pas de dégradés ni contours teintés).
 */
/** Assets `/public/images/menuswipe/` pour le bandeau de segments (prioritaire sur Lucide si défini). */
export const SEGMENT_MENU_IMAGE_BASE = '/images/menuswipe';

export type CatalogSegmentTabTheme = {
  label: string;
  /** Illustration PNG du segment ; pas de bloc de couleur derrière dans l’UI. */
  iconSrc: string;
  /** Rétention optionnelle (écran sans images, tests) — ignoré si `iconSrc` est défini dans le formulaire swipe. */
  icon?: string;
  cardIdle: string;
  cardActive: string;
  /** Remplissage pastel sous Lucide uniquement ; inutilisé quand `iconSrc` est affichée. */
  iconIdle?: string;
  iconActive?: string;
};

/** Bordure discrète identique repos / sélection ; seul le fond colore la tuile */
const EDGE = 'border border-gray-200/90 shadow-none dark:border-gray-700/85';

export const CATALOG_SEGMENT_THEMES: Record<string, CatalogSegmentTabTheme> = {
  examens: {
    label: 'Prélèvements',
    iconSrc: `${SEGMENT_MENU_IMAGE_BASE}/examenmenu.png`,
    icon: 'i-lucide-test-tubes',
    cardIdle: `${EDGE} bg-white dark:bg-gray-950`,
    cardActive: `${EDGE} bg-sky-100 dark:bg-sky-950/50`,
    iconIdle: 'bg-sky-100 text-sky-700 dark:bg-sky-900/45 dark:text-sky-400',
    iconActive: 'bg-sky-200 text-sky-900 dark:bg-sky-800 dark:text-sky-50',
  },
  soins: {
    label: 'Soins',
    iconSrc: `${SEGMENT_MENU_IMAGE_BASE}/soinsmenu.png`,
    icon: 'i-lucide-heart-pulse',
    cardIdle: `${EDGE} bg-white dark:bg-gray-950`,
    cardActive: `${EDGE} bg-rose-100 dark:bg-rose-950/45`,
    iconIdle: 'bg-rose-100 text-rose-700 dark:bg-rose-900/42 dark:text-rose-400',
    iconActive: 'bg-rose-200 text-rose-900 dark:bg-rose-800 dark:text-rose-50',
  },
  suivi: {
    label: 'Suivi',
    iconSrc: `${SEGMENT_MENU_IMAGE_BASE}/suivimenu.png`,
    icon: 'i-lucide-activity',
    cardIdle: `${EDGE} bg-white dark:bg-gray-950`,
    cardActive: `${EDGE} bg-emerald-100 dark:bg-emerald-950/42`,
    iconIdle: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/42 dark:text-emerald-400',
    iconActive: 'bg-emerald-200 text-emerald-950 dark:bg-emerald-800 dark:text-emerald-50',
  },
  hygiene: {
    label: 'Hygiène',
    /** Fichier sans accent pour éviter 404 NFC/NFD (macOS/APFS vs URL du bundle). */
    iconSrc: `${SEGMENT_MENU_IMAGE_BASE}/hygienemenu.png`,
    icon: 'i-lucide-bath',
    cardIdle: `${EDGE} bg-white dark:bg-gray-950`,
    cardActive: `${EDGE} bg-cyan-100 dark:bg-cyan-950/42`,
    iconIdle: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/42 dark:text-cyan-400',
    iconActive: 'bg-cyan-200 text-cyan-950 dark:bg-cyan-800 dark:text-cyan-50',
  },
  prevention: {
    label: 'Prévention',
    iconSrc: `${SEGMENT_MENU_IMAGE_BASE}/preventionmenu.png`,
    icon: 'i-lucide-shield-plus',
    cardIdle: `${EDGE} bg-white dark:bg-gray-950`,
    cardActive: `${EDGE} bg-amber-100 dark:bg-amber-950/42`,
    iconIdle: 'bg-amber-100 text-amber-800 dark:bg-amber-900/42 dark:text-amber-400',
    iconActive: 'bg-amber-200 text-amber-950 dark:bg-amber-800 dark:text-amber-50',
  },
  divers: {
    label: 'Divers',
    iconSrc: `${SEGMENT_MENU_IMAGE_BASE}/diversmenu.png`,
    icon: 'i-lucide-layout-grid',
    cardIdle: `${EDGE} bg-white dark:bg-gray-950`,
    cardActive: `${EDGE} bg-violet-100 dark:bg-violet-950/42`,
    iconIdle: 'bg-violet-100 text-violet-800 dark:bg-violet-900/42 dark:text-violet-400',
    iconActive: 'bg-violet-200 text-violet-950 dark:bg-violet-800 dark:text-violet-50',
  },
};

export const ALL_SEGMENT_THEME: CatalogSegmentTabTheme = {
  label: 'Tous',
  iconSrc: `${SEGMENT_MENU_IMAGE_BASE}/tous.png`,
  icon: 'i-lucide-layers',
  cardIdle: `${EDGE} bg-white dark:bg-gray-950`,
  cardActive: `${EDGE} bg-primary-100 dark:bg-primary-950/40`,
  iconIdle: 'bg-slate-100 text-slate-600 dark:bg-gray-900 dark:text-slate-400',
  iconActive: 'bg-primary-200 text-primary-900 dark:bg-primary-800 dark:text-primary-50',
};

export const FALLBACK_SEGMENT_THEME: CatalogSegmentTabTheme = {
  label: 'Autres',
  iconSrc: `${SEGMENT_MENU_IMAGE_BASE}/diversmenu.png`,
  icon: 'i-lucide-tag',
  cardIdle: `${EDGE} bg-white dark:bg-gray-950`,
  cardActive: `${EDGE} bg-slate-100 dark:bg-slate-950/55`,
  iconIdle: 'bg-slate-100 text-slate-600 dark:bg-gray-900 dark:text-slate-400',
  iconActive: 'bg-slate-300 text-slate-900 dark:bg-slate-700 dark:text-slate-50',
};

export function catalogSegmentThemeForKey(key: string): CatalogSegmentTabTheme | null {
  return CATALOG_SEGMENT_THEMES[key] ?? null;
}
