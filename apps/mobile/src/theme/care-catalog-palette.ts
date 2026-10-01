import { hexToRgba } from './color-utils';
import { palette } from './colors';

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

export const DEFAULT_CATALOG_GROUP_THEME: CatalogGroupTheme = {
  orb: palette.brand[200],
  surface: palette.white,
  surfaceActive: palette.brand[100],
  border: palette.slate[200],
  borderActive: palette.brand[500],
  label: palette.slate[500],
  labelActive: palette.brand[900],
  gradient: [palette.brand[100], palette.brand[200]],
  glow: hexToRgba(palette.brand[500], 0.22),
};

/** Thèmes marque d’origine des groupes catalogue (mode standard, hors daltonisme). */
export const STANDARD_CATALOG_GROUP_THEMES: Record<string, CatalogGroupTheme> = {
  all: {
    orb: palette.brand[200],
    surface: '#F8FFFE',
    surfaceActive: palette.brand[100],
    border: palette.brand[200],
    borderActive: palette.brand[500],
    label: '#5B7A75',
    labelActive: palette.brand[900],
    gradient: [palette.brand[100], palette.brand[200]],
    glow: hexToRgba(palette.brand[500], 0.28),
  },
  examens: {
    orb: '#99F6E4',
    surface: '#F8FFFE',
    surfaceActive: '#CCFBF1',
    border: palette.brand[200],
    borderActive: '#0D9488',
    label: '#5B7A75',
    labelActive: '#0F766E',
    gradient: ['#CCFBF1', '#99F6E4'],
    glow: hexToRgba('#0D9488', 0.28),
  },
  soins: {
    orb: '#F9A8D4',
    surface: '#FFFBFC',
    surfaceActive: '#FCE7F3',
    border: '#F9A8D4',
    borderActive: '#DB2777',
    label: '#9D6B82',
    labelActive: '#9D174D',
    gradient: ['#FCE7F3', '#F9A8D4'],
    glow: hexToRgba('#DB2777', 0.22),
  },
  suivi: {
    orb: '#93C5FD',
    surface: '#FAFCFF',
    surfaceActive: '#DBEAFE',
    border: '#93C5FD',
    borderActive: '#2563EB',
    label: '#5C6F8A',
    labelActive: '#1D4ED8',
    gradient: ['#DBEAFE', '#93C5FD'],
    glow: hexToRgba('#2563EB', 0.22),
  },
  hygiene: {
    orb: '#7DD3FC',
    surface: '#F8FCFF',
    surfaceActive: '#E0F2FE',
    border: '#7DD3FC',
    borderActive: '#0284C7',
    label: '#5C7A8F',
    labelActive: '#0369A1',
    gradient: ['#E0F2FE', '#7DD3FC'],
    glow: hexToRgba('#0284C7', 0.22),
  },
  prevention: {
    orb: palette.green[200],
    surface: '#FAFFFB',
    surfaceActive: palette.green[100],
    border: palette.green[200],
    borderActive: palette.green[600],
    label: '#5F7A68',
    labelActive: palette.green[700],
    gradient: [palette.green[100], palette.green[200]],
    glow: hexToRgba(palette.green[600], 0.22),
  },
  divers: {
    orb: '#FCD34D',
    surface: '#FFFDF8',
    surfaceActive: palette.amber[100],
    border: '#FCD34D',
    borderActive: palette.amber[600],
    label: '#8A7A5C',
    labelActive: palette.amber[700],
    gradient: [palette.amber[100], '#FCD34D'],
    glow: hexToRgba(palette.amber[600], 0.2),
  },
};

/** Pastilles soin (une couleur par soin, ordre stable) — mode standard. */
export const STANDARD_CARE_TILE_ORB_COLORS: readonly string[] = [
  '#F9A8D4',
  '#93C5FD',
  '#86EFAC',
  '#FCD34D',
  '#C4B5FD',
  '#FDBA74',
  '#67E8F9',
  '#FDA4AF',
  '#A5B4FC',
  '#FBBF24',
  '#F472B6',
  '#4ADE80',
  '#FB923C',
  '#D8B4FE',
  palette.brand[300],
  '#FB7185',
];

/** Pastille de repli au-delà de la palette (teinte répartie par index). */
export function careTileFallbackOrbColor(index: number): string {
  const hue = (index * 41) % 360;
  return `hsl(${hue}, 48%, 80%)`;
}
