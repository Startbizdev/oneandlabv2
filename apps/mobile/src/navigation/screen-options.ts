import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { AppHeader } from '@/components/navigation/AppHeader';
import { HEADER_ACTION_MARGIN_RIGHT } from '@/navigation/HeaderActionButton';
import { colors, spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/**
 * Onglets : header natif (AppHeader + hooks casse BottomTabView).
 * Marges cloche / actions alignées via header*ContainerStyle.
 */
function nativeTabHeaderOptions(): Pick<
  BottomTabNavigationOptions,
  | 'headerShown'
  | 'headerShadowVisible'
  | 'headerStyle'
  | 'headerTintColor'
  | 'headerTitleStyle'
  | 'headerTitleAlign'
  | 'headerBackTitle'
  | 'headerBackButtonDisplayMode'
  | 'headerRightContainerStyle'
  | 'headerLeftContainerStyle'
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
    headerRightContainerStyle: {
      paddingRight: HEADER_ACTION_MARGIN_RIGHT,
    },
    headerLeftContainerStyle: {
      paddingLeft: spacing[4],
    },
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

/** Onglets — header natif + marges homogènes (cloche, logo, CTA). */
export function tabScreenOptions(
  overrides?: BottomTabNavigationOptions,
): BottomTabNavigationOptions {
  return {
    ...nativeTabHeaderOptions(),
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
