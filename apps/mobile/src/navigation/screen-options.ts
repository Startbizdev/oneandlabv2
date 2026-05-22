import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { colors } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** En-têtes Stack / onglets — React Navigation gère la safe area du haut. */
export function stackHeaderOptions(
  overrides?: NativeStackNavigationOptions,
): NativeStackNavigationOptions {
  return {
    headerShown: true,
    headerBackTitle: Platform.OS === 'ios' ? '' : 'Retour',
    headerBackButtonDisplayMode: Platform.OS === 'ios' ? 'minimal' : 'generic',
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.primary,
    headerTitleStyle: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.lg,
      color: colors.textPrimary,
    },
    headerTitleAlign: 'left',
    contentStyle: { flex: 1, backgroundColor: colors.background },
    ...overrides,
  };
}

export function tabScreenOptions(
  overrides?: BottomTabNavigationOptions,
): BottomTabNavigationOptions {
  const header = stackHeaderOptions();
  return {
    headerShown: header.headerShown,
    headerShadowVisible: header.headerShadowVisible,
    headerStyle: header.headerStyle,
    headerTintColor: header.headerTintColor,
    headerTitleStyle: header.headerTitleStyle,
    headerTitleAlign: header.headerTitleAlign,
    sceneStyle: { flex: 1, backgroundColor: colors.background },
    ...overrides,
  };
}

/** Écrans plein écran (login, wizard) — pas de header natif. */
export function fullScreenOptions(): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: { flex: 1, backgroundColor: colors.background },
  };
}

/** Wizard booking — plein écran pour que flex:1 + footer sticky fonctionnent (évite formSheet iOS). */
export function bookingWizardScreenOptions(): NativeStackNavigationOptions {
  return stackHeaderOptions({
    presentation: 'fullScreenModal',
  });
}
