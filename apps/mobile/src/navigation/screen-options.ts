import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { radius, type AppColors, type Theme } from '@/theme';
import { getSheet } from '@/components/ui/sheet/sheet-store';

function sceneContentStyle(c: AppColors): NativeStackNavigationOptions['contentStyle'] {
  return { minWidth: 0, flex: 1, backgroundColor: c.background };
}

/** Stack — headerShown false ; StackChromeScreen affiche le header (titres : `STACK_HEADER_CATALOG`). */
export function stackHeaderOptions(
  { colors: c }: Theme,
  overrides?: NativeStackNavigationOptions,
): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: sceneContentStyle(c),
    ...(overrides ?? {}),
  };
}

/**
 * Wizard booking — écran de pile normal.
 * Un `fullScreenModal` empêche iOS d'afficher la fiche du soin (sheet racine) par-dessus.
 */
export function bookingWizardScreenOptions(theme: Theme): NativeStackNavigationOptions {
  return stackHeaderOptions(theme);
}

function sheetIdFromParams(params: object | undefined): string {
  return params && 'id' in params && typeof params.id === 'string' ? params.id : '';
}

/**
 * Sheet native iOS / Android (`app/sheet/[id].tsx`) : hauteur (figée à l'ouverture) et geste lus dans l'entrée
 * du `SheetModal`. `gestureEnabled` n'agit que sur iOS ; Android laisse toujours glisser la sheet vers le bas.
 */
export function sheetScreenOptions(
  { colors: c }: Theme,
  params: object | undefined,
): NativeStackNavigationOptions {
  const entry = getSheet(sheetIdFromParams(params));
  return {
    headerShown: false,
    presentation: 'formSheet',
    sheetAllowedDetents: entry?.detents ?? 'fitToContents',
    /** Ouvre au palier le plus haut. Android fige les paliers au premier layout. */
    sheetInitialDetentIndex: 'last',
    /**
     * La sheet s'arrête sous la barre de statut. `true` la fait monter dans la safe zone
     * (heure, réseau) : le titre passe sous les icônes système.
     */
    sheetShouldOverflowTopInset: false,
    sheetGrabberVisible: true,
    sheetCornerRadius: radius['2xl'],
    gestureEnabled: entry?.dismissible ?? true,
    contentStyle: { flex: 1, width: '100%', backgroundColor: c.surface },
  };
}

/** Tutoriel startup — plein écran, sans header stack. */
export function onboardingScreenOptions(theme: Theme): NativeStackNavigationOptions {
  return stackHeaderOptions(theme);
}
