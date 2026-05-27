import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import { colors, elevation, spacing, radius } from '@/theme';

/** Padding horizontal interne (titres, actions). */
export const APP_HEADER_INNER_H_PADDING = spacing[4];

/** Teinte latérale sous le header (visible dans les coins arrondis du contenu). */
export const APP_HEADER_CHROME = colors.primaryLight;

/** Coins arrondis en haut de la feuille de contenu. */
export const APP_CONTENT_TOP_RADIUS = radius['2xl'];

/** Bordure haute de la feuille de contenu (séparation header / contenu). */
export const APP_CONTENT_SHEET_BORDER = 'rgba(15, 23, 42, 0.07)';

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
export function appContentSheetShadowStyle(): ViewStyle {
  return {
    flex: 1,
    backgroundColor: colors.surface,
    ...contentSheetTopRadius(),
    ...elevation.contentSheetTop,
  };
}

/** Surface intérieure — bordure hairline + clip des coins arrondis. */
export function appContentSheetSurfaceStyle(): ViewStyle {
  return {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    borderColor: APP_CONTENT_SHEET_BORDER,
    ...contentSheetTopRadius(),
  };
}

/** Stack (vue unique) — ombre seule, sans bordure sur le même calque. */
export function appContentSheetFrameStyle(): ViewStyle {
  return appContentSheetShadowStyle();
}

/** @deprecated Préférer appContentSheetSurfaceStyle sur le conteneur intérieur. */
export function appContentSheetClipStyle(): ViewStyle {
  return appContentSheetSurfaceStyle();
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

/** Onglets — fond chrome derrière la feuille (TabScreenShell). */
export function appTabSceneStyle(): ViewStyle {
  return {
    flex: 1,
    backgroundColor: APP_HEADER_CHROME,
  };
}

/** Stack — feuille blanche à coins haut arrondis sous le header. */
export function appStackContentStyle(opts?: { rounded?: boolean }): ViewStyle {
  const rounded = opts?.rounded !== false;
  if (!rounded) {
    return { flex: 1, backgroundColor: colors.surface };
  }
  return appContentSheetFrameStyle();
}

/** @deprecated Utiliser appTabSceneStyle ou appStackContentStyle. */
export function appContentShellStyle(opts?: { rounded?: boolean }): ViewStyle {
  return appStackContentStyle(opts);
}

/** Espace entre le bouton retour et le titre (stack). */
export const APP_HEADER_BACK_TITLE_GAP = spacing[2];

/**
 * Onglets — contenu calé vers le bas du header (respiration au-dessus du contenu arrondi).
 */
export function headerSlotBottomStyle(paddingBottom: number = APP_HEADER_INNER_BOTTOM): ViewStyle {
  return {
    paddingBottom,
    justifyContent: 'flex-end',
  };
}

/**
 * Stack — padding bas sans `justifyContent: 'flex-end'` (évite le décalage retour / titre).
 */
export function headerStackSlotBottomStyle(
  paddingBottom: number = APP_HEADER_INNER_BOTTOM,
): ViewStyle {
  return { paddingBottom };
}
