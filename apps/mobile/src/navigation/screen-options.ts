import { createElement } from 'react';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { StackGlassBackButton } from '@/navigation/StackGlassBackButton';
import { appStackContentStyle } from '@/components/navigation/header-layout';
import { colors, font } from '@/theme';
import { fontSize } from '@/theme/typography';

/** Stack — headerShown false ; StackChromeScreen affiche le glass flottant. */
export function stackHeaderOptions(
  overrides?: NativeStackNavigationOptions,
): NativeStackNavigationOptions {
  return {
    headerShown: false,
    headerShadowVisible: false,
    headerTintColor: colors.primary,
    headerTitleStyle: {
      ...font.heading,
      fontSize: fontSize.lg,
      color: colors.textPrimary,
    },
    headerTitleAlign: 'left' as const,
    headerLeft: () => createElement(StackGlassBackButton),
    contentStyle: appStackContentStyle({ rounded: false }),
    ...(overrides ?? {}),
  } as NativeStackNavigationOptions;
}

/** Écrans plein écran (login, wizard merci) — pas de header. */
export function fullScreenOptions(): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: appStackContentStyle({ rounded: false }),
  };
}

/** Wizard booking — plein écran pour flex:1 + footer sticky. */
export function bookingWizardScreenOptions(): NativeStackNavigationOptions {
  return stackHeaderOptions({
    presentation: 'fullScreenModal',
  });
}

/** Tutoriel startup — plein écran, sans header stack. */
export function onboardingScreenOptions(): NativeStackNavigationOptions {
  return fullScreenOptions();
}
