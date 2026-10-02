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

/** Wizard booking — plein écran pour flex:1 + footer sticky. */
export function bookingWizardScreenOptions(theme: Theme): NativeStackNavigationOptions {
  return stackHeaderOptions(theme, {
    presentation: 'fullScreenModal',
  });
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
    sheetGrabberVisible: true,
    sheetCornerRadius: radius['2xl'],
    gestureEnabled: entry?.dismissible ?? true,
    contentStyle: { backgroundColor: c.surface },
  };
}

/** Tutoriel startup — plein écran, sans header stack. */
export function onboardingScreenOptions(theme: Theme): NativeStackNavigationOptions {
  return stackHeaderOptions(theme);
}
