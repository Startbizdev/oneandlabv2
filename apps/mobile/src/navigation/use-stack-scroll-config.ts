import {
  buildTabSceneScrollConfig,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';
import { spacing } from '@/theme';
import type { StyleProp, ViewStyle } from 'react-native';

/** Respiration sous le header glass stack (aligné listes RDV). */
export const STACK_SCENE_CONTENT_TOP_GAP = spacing[3];

/** Padding haut pour vues stack fixes (loading, erreur) hors ScrollView. */
export function useStackContentTopInset(): number {
  const { insetTop } = useTabSceneInsets();
  return insetTop + STACK_SCENE_CONTENT_TOP_GAP;
}

/** Scroll stack sous header glass flottant (provider dans `StackSceneInsetLayout`). */
export function useStackScrollConfig(
  contentContainerStyle?: StyleProp<ViewStyle>,
  options?: { extraTop?: number; extraBottom?: number },
) {
  const sceneInsets = useTabSceneInsets();
  return buildTabSceneScrollConfig(sceneInsets, contentContainerStyle, options);
}
