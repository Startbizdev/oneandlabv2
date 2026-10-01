import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/theme';

export type SceneBottomInset = {
  /** Safe area basse encore visible dans la scène (0 dans un onglet : la tab bar la couvre). */
  safeAreaBottom: number;
  /** Padding bas d'une barre d'action collée au bas de la scène. */
  footerPadding: number;
  /** Hauteur de la tab bar sous la scène (0 hors onglet) — à compenser quand le clavier s'ouvre. */
  tabBarHeight: number;
};

export function useSceneBottomInset(): SceneBottomInset {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const { bottom } = useSafeAreaInsets();

  if (tabBarHeight !== undefined) {
    return { safeAreaBottom: 0, footerPadding: spacing[2], tabBarHeight };
  }
  return { safeAreaBottom: bottom, footerPadding: Math.max(bottom, spacing[2]), tabBarHeight: 0 };
}
