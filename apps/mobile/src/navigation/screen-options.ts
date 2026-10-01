import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { AppColors, Theme } from '@/theme';

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

/** Tutoriel startup — plein écran, sans header stack. */
export function onboardingScreenOptions(theme: Theme): NativeStackNavigationOptions {
  return stackHeaderOptions(theme);
}
