import { createElement } from 'react';
import { Platform, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { getDefaultHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavChromeBackground } from '@/components/navigation/NavChromeBackground';
import { StackGlassBackButton } from '@/navigation/StackGlassBackButton';
import {
  APP_HEADER_INNER_H_PADDING,
  APP_HEADER_INNER_BOTTOM,
  appStackContentStyle,
  appTabSceneStyle,
  headerSlotBottomStyle,
} from '@/components/navigation/header-layout';
import { colors } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

function renderHeaderBackground(
  props?: { style?: StyleProp<ViewStyle> } | null,
) {
  return createElement(NavChromeBackground, {
    style: (props?.style ?? StyleSheet.absoluteFillObject) as StyleProp<ViewStyle>,
    variant: 'stack',
  });
}

function sharedHeaderVisualOptions(innerBottom = APP_HEADER_INNER_BOTTOM) {
  const slotBottom = headerSlotBottomStyle(innerBottom);

  return {
    headerShown: true,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: 'transparent' as const },
    headerTintColor: colors.primary,
    headerTitleStyle: {
      fontFamily: fontFamily.bold,
      fontSize: fontSize.lg,
      color: colors.textPrimary,
    },
    headerTitleAlign: 'left' as const,
    headerRightContainerStyle: {
      paddingRight: APP_HEADER_INNER_H_PADDING,
      overflow: 'visible' as const,
      ...slotBottom,
    },
    headerLeftContainerStyle: {
      paddingLeft: 0,
      flexShrink: 1,
      minWidth: 0,
      ...slotBottom,
    },
    headerTitleContainerStyle: {
      marginLeft: 0,
      marginRight: 0,
      ...slotBottom,
    },
    headerBackTitle: Platform.OS === 'ios' ? '' : 'Retour',
    headerBackButtonDisplayMode: (Platform.OS === 'ios' ? 'minimal' : 'generic') as
      | 'minimal'
      | 'generic',
  };
}

function tabHeaderHeight(layout: { width: number; height: number }, topInset: number): number {
  return getDefaultHeaderHeight(layout, false, topInset) + APP_HEADER_INNER_BOTTOM;
}

/**
 * Onglets — hauteur header calculée + marge interne bas (hooks OK dans le layout, pas dans le header).
 */
export function useTabScreenOptions(
  overrides?: BottomTabNavigationOptions,
): BottomTabNavigationOptions {
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();

  return {
    ...sharedHeaderVisualOptions(),
    headerBackground: renderHeaderBackground,
    headerStyle: {
      height: tabHeaderHeight(layout, insets.top),
      backgroundColor: 'transparent',
    },
    headerTitleContainerStyle: {
      marginLeft: 0,
      marginRight: 0,
      paddingLeft: APP_HEADER_INNER_H_PADDING,
      ...headerSlotBottomStyle(),
    },
    sceneStyle: appTabSceneStyle(),
    ...(overrides ?? {}),
  };
}

/** @deprecated Préférer `useTabScreenOptions()` pour la hauteur header correcte. */
export function tabScreenOptions(
  overrides?: BottomTabNavigationOptions,
): BottomTabNavigationOptions {
  return {
    ...sharedHeaderVisualOptions(),
    headerBackground: renderHeaderBackground,
    sceneStyle: appTabSceneStyle(),
    ...(overrides ?? {}),
  };
}

/** Stack — headerShown false ; StackChromeScreen affiche le glass flottant. */
export function stackHeaderOptions(
  overrides?: NativeStackNavigationOptions,
): NativeStackNavigationOptions {
  return {
    headerShown: false,
    headerShadowVisible: false,
    headerTintColor: colors.primary,
    headerTitleStyle: {
      fontFamily: fontFamily.bold,
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
