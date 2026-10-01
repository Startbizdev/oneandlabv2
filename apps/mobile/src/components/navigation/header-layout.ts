import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import { elevation, hexToRgba, palette, spacing, radius, type AppColors } from '@/theme';

/** Padding horizontal interne (titres, actions). */
export const APP_HEADER_INNER_H_PADDING = spacing[4];

/** Coins arrondis en haut de la feuille de contenu. */
export const APP_CONTENT_TOP_RADIUS = radius['2xl'];

/** Bordure haute de la feuille de contenu (séparation header / contenu). */
export const APP_CONTENT_SHEET_BORDER = hexToRgba(palette.slate[900], 0.07);

const contentSheetTopRadius = (): Pick<
  ViewStyle,
  'borderTopLeftRadius' | 'borderTopRightRadius' | 'borderCurve'
> => ({
  borderTopLeftRadius: APP_CONTENT_TOP_RADIUS,
  borderTopRightRadius: APP_CONTENT_TOP_RADIUS,
  ...Platform.select({
    ios: { borderCurve: 'continuous' as const },
    default: {},
  }),
});

/** Calque externe — ombre vers le haut, sans bordure ni overflow (shadow derrière la feuille). */
export function appContentSheetShadowStyle(c: AppColors): ViewStyle {
  return {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.surface,
    ...contentSheetTopRadius(),
    ...elevation.contentSheetTop,
  };
}

/** Surface intérieure — bordure hairline + clip des coins arrondis. */
export function appContentSheetSurfaceStyle(c: AppColors): ViewStyle {
  return {
    minWidth: 0,
    flex: 1,
    overflow: 'hidden',
    backgroundColor: c.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: APP_CONTENT_SHEET_BORDER,
    ...contentSheetTopRadius(),
  };
}

/** Respiration interne en bas du header (titre, cloche). */
export const APP_HEADER_INNER_BOTTOM = spacing[3];

/** Taille des boutons d’action header (retour, etc.). */
export const APP_HEADER_ORB_SIZE = 40;

/** Icône dans le bouton d’action. */
export const APP_HEADER_ORB_ICON = 21;

export const APP_HEADER_ORB_STROKE = 2.25;

/** Icône titre onglet. */
export const APP_HEADER_TITLE_ICON_SIZE = 18;

/** Onglets et stacks edge-to-edge — corps plat (fond d'app), sans coins arrondis ni ombre. */
export function appFlatContentStyle(c: AppColors): ViewStyle {
  return {
    minWidth: 0,
    flex: 1,
    backgroundColor: c.background,
  };
}

/** Espace entre le bouton retour et le titre (stack). */
export const APP_HEADER_BACK_TITLE_GAP = spacing[2];
