import { createElement } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { StackGlassBackButton } from '@/navigation/StackGlassBackButton';
import { appFlatContentStyle } from '@/components/navigation/header-layout';
import { font, type Theme } from '@/theme';

/** Stack — headerShown false ; StackChromeScreen affiche le glass flottant. */
export function stackHeaderOptions(
  { colors: c, fontSize }: Theme,
  overrides?: NativeStackNavigationOptions,
): NativeStackNavigationOptions {
  return {
    headerShown: false,
    headerShadowVisible: false,
    headerTintColor: c.primary,
    headerTitleStyle: {
      ...font.heading,
      fontSize: fontSize.lg,
      color: c.textPrimary,
    },
    headerTitleAlign: 'left' as const,
    headerLeft: () => createElement(StackGlassBackButton),
    contentStyle: appFlatContentStyle(c),
    ...(overrides ?? {}),
  } as NativeStackNavigationOptions;
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
