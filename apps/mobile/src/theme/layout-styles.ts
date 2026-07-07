import { StyleSheet } from 'react-native';
import type { AppColors } from './colors';
import { spacing } from './tokens';

/** Row horizontale standard — corps flexible sans overflow. */
export function layoutRow(gap: number = spacing[2.5]) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap,
    minWidth: 0,
  };
}

/** Row centrée verticalement. */
export function layoutRowCenter(gap: number = spacing[2]) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minWidth: 0,
    gap,
  };
}

/** Row centrée horizontalement et verticalement. */
export function layoutRowCenterAll(gap: number = spacing[2]) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 0,
    gap,
  };
}

/** Row space-between (lignes d’option, en-têtes de carte). */
export function layoutRowBetween(gap: number = spacing[2]) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    minWidth: 0,
    gap,
  };
}

/** Row avec retour à la ligne (chips, grilles légères). */
export function layoutRowWrap(gap: number = spacing[2]) {
  return {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    minWidth: 0,
    gap,
  };
}

/** Row baseline + wrap (valeurs + unités). */
export function layoutRowBaselineWrap(gap: number = spacing[1]) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'baseline' as const,
    flexWrap: 'wrap' as const,
    minWidth: 0,
    gap,
  };
}

/** Row alignée en bas (en-têtes graphiques). */
export function layoutRowEndBetween(gap: number = spacing[2]) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    justifyContent: 'space-between' as const,
    minWidth: 0,
    gap,
  };
}

/** Row actions alignées à droite (accessoire clavier). */
export function layoutRowEndActions(gap: number = spacing[2]) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-end' as const,
    minWidth: 0,
    gap,
  };
}

export const flexText = {
  flex: 1,
  minWidth: 0,
} as const;

export const flexCenter = {
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
} as const;

export function hairlineTop(c: AppColors) {
  return {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderLight,
  };
}

export function hairlineBottom(c: AppColors) {
  return {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderLight,
  };
}

export function iconSlot(size: number) {
  return {
    width: size,
    height: size,
    flexGrow: 0,
    flexShrink: 0,
  };
}

export function actionsSlot(gap: number = spacing[1.5]) {
  return {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-end' as const,
    gap,
    flexShrink: 0,
    marginLeft: 'auto' as const,
  };
}
