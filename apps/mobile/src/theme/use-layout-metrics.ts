import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { resolveBreakpoint, type Breakpoint, BREAKPOINTS } from './breakpoints';

export type LayoutMetrics = {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isCompact: boolean;
  isWide: boolean;
  /** Largeur max recommandée pour texte / cartes centrées. */
  contentMaxWidth: number;
  /** Hauteur min utile (hors safe area approximative). */
  usableHeight: number;
};

/** Largeurs max de contenu centré par breakpoint. */
export const CONTENT_MAX_WIDTH: Record<Breakpoint, number> = {
  compact: 320,
  default: 360,
  wide: 420,
};

export function contentMaxWidthFor(breakpoint: Breakpoint): number {
  return CONTENT_MAX_WIDTH[breakpoint];
}

export function useLayoutMetrics(): LayoutMetrics {
  const { width, height } = useWindowDimensions();
  return useMemo(() => {
    const breakpoint = resolveBreakpoint(width);
    return {
      width,
      height,
      breakpoint,
      isCompact: width < BREAKPOINTS.compact,
      isWide: width >= BREAKPOINTS.wide,
      contentMaxWidth: CONTENT_MAX_WIDTH[breakpoint],
      usableHeight: height,
    };
  }, [width, height]);
}

/** Choisit une valeur selon le breakpoint courant. */
export function responsiveValue<T>(
  metrics: LayoutMetrics,
  values: { compact: T; default: T; wide?: T },
): T {
  if (metrics.isCompact) return values.compact;
  if (metrics.isWide && values.wide !== undefined) return values.wide;
  return values.default;
}

/** Nombre de colonnes grille selon la largeur écran. */
export function gridColumns(
  screenWidth: number,
  options: { compact: number; default: number; wide?: number },
): number {
  const bp = resolveBreakpoint(screenWidth);
  if (bp === 'compact') return options.compact;
  if (bp === 'wide') return options.wide ?? options.default;
  return options.default;
}

/** Taille de cellule pour une grille à N colonnes avec gap et padding horizontal tokenisés. */
export function gridCellSize(
  screenWidth: number,
  columns: number,
  gap: number,
  horizontalPadding: number,
): number {
  const totalGap = gap * (columns - 1);
  return Math.floor((screenWidth - horizontalPadding * 2 - totalGap) / columns);
}

/** Hauteur carousel / hero — proportionnelle à l'écran avec plancher. */
export function carouselHeight(screenHeight: number, ratio = 0.58, floor = 320): number {
  return Math.max(Math.round(screenHeight * ratio), floor);
}

/** Largeur max paragraphes centrés (empty states, panneaux vides). */
export function centeredCopyMaxWidth(metrics: LayoutMetrics): number {
  return responsiveValue(metrics, { compact: 260, default: 280, wide: 320 });
}

/** Largeur max zone boutons centrée (fullWidth dans empty states). */
export function centeredActionMaxWidth(metrics: LayoutMetrics): number {
  return responsiveValue(metrics, { compact: 240, default: 280, wide: 340 });
}

/** Largeur max CTA header (icône + label). */
export function headerActionMaxWidth(metrics: LayoutMetrics): number {
  return responsiveValue(metrics, { compact: 132, default: 148, wide: 168 });
}

/** Largeur max cellule calendrier (grille 7 colonnes). */
export function calendarCellMaxWidth(screenWidth: number, cap = 44): number {
  return Math.min(cap, Math.floor(screenWidth / 7));
}
