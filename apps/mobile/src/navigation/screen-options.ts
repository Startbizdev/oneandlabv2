import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { AppHeader } from '@/components/navigation/AppHeader';
import { colors } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Header natif (onglets) — évite AppHeader dans BottomTabView (ordre des Hooks). */
function nativeHeaderOptions(): Pick<
  BottomTabNavigationOptions,
  | 'headerShown'
  | 'headerShadowVisible'
  | 'headerStyle'
  | 'headerTintColor'
  | 'headerTitleStyle'
  | 'headerTitleAlign'
  | 'headerBackTitle'
  | 'headerBackButtonDisplayMode'
> {
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
  };
}

/** Stack — header React custom (pas de barre native iOS/Android). */
export function stackHeaderOptions(
  overrides?: NativeStackNavigationOptions,
): NativeStackNavigationOptions {
  return {
    headerShown: true,
    header: AppHeader as NativeStackNavigationOptions['header'],
    contentStyle: { flex: 1, backgroundColor: colors.background },
    ...overrides,
  };
}

/** Onglets — header natif + tab bar classique (pas de position absolute). */
export function tabScreenOptions(
  overrides?: BottomTabNavigationOptions,
): BottomTabNavigationOptions {
  return {
    ...nativeHeaderOptions(),
    sceneStyle: { flex: 1, backgroundColor: colors.background },
    ...overrides,
  };
}

/** Écrans plein écran (login, wizard merci) — pas de header. */
export function fullScreenOptions(): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: { flex: 1, backgroundColor: colors.background },
  };
}

/** Wizard booking — plein écran pour flex:1 + footer sticky. */
export function bookingWizardScreenOptions(): NativeStackNavigationOptions {
  return stackHeaderOptions({
    presentation: 'fullScreenModal',
  });
}
