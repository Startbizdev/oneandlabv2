import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { appFlatContentStyle } from '@/components/navigation/header-layout';
import type { Theme } from '@/theme';

/** Stack — headerShown false ; StackChromeScreen affiche le header (titres : `STACK_HEADER_CATALOG`). */
export function stackHeaderOptions(
  { colors: c }: Theme,
  overrides?: NativeStackNavigationOptions,
): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: appFlatContentStyle(c),
    ...(overrides ?? {}),
  };
}

/** Wizard booking — plein écran pour flex:1 + footer sticky. */
export function bookingWizardScreenOptions(theme: Theme): NativeStackNavigationOptions {
  return stackHeaderOptions(theme, {
    presentation: 'fullScreenModal',
  });
}

/** Tutoriel startup — plein écran, sans header stack. */
export function onboardingScreenOptions({ colors: c }: Theme): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: appFlatContentStyle(c),
  };
}
