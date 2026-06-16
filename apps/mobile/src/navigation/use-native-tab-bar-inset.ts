import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NATIVE_TAB_BAR_CONTENT_HEIGHT,
  NATIVE_TAB_BAR_CONTENT_PADDING_EXTRA,
} from '@/components/navigation/nav-chrome-tokens';

/** Hauteur tab bar + safe area bas (NativeTabs ne fournit pas le contexte RN). */
export function estimateNativeTabBarHeight(bottomInset: number): number {
  return NATIVE_TAB_BAR_CONTENT_HEIGHT + bottomInset;
}

/**
 * Inset bas pour contenu scrollable / footer au-dessus de la tab bar native.
 * Fallback safe area + hauteur standard quand `useBottomTabBarHeight()` n’est pas disponible.
 */
export function useNativeTabBarInset(extra = NATIVE_TAB_BAR_CONTENT_PADDING_EXTRA): number {
  const contextHeight = useContext(BottomTabBarHeightContext);
  const { bottom } = useSafeAreaInsets();

  const tabBarHeight =
    contextHeight !== undefined && contextHeight > 0
      ? contextHeight
      : estimateNativeTabBarHeight(bottom);

  return tabBarHeight + extra;
}
