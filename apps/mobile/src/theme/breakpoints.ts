/** Seuils de largeur écran (px logiques) — téléphones portrait uniquement. */
export const BREAKPOINTS = {
  /** iPhone SE, petits Android */
  compact: 360,
  /** Gabarit standard */
  default: 390,
  /** Pro Max, grands Android */
  wide: 430,
} as const;

export type Breakpoint = 'compact' | 'default' | 'wide';

export function resolveBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.compact) return 'compact';
  if (width >= BREAKPOINTS.wide) return 'wide';
  return 'default';
}

export function isCompactWidth(width: number): boolean {
  return width < BREAKPOINTS.compact;
}
