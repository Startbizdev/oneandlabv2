import {
  buildTabSceneScrollConfig,
  useTabSceneInsets,
} from '@/components/navigation/liquid-glass-header-inset';

/** Scroll stack sous header glass flottant (provider dans `StackSceneInsetLayout`). */
export function useStackScrollConfig(
  contentContainerStyle?: object | object[] | null,
  options?: { extraTop?: number; extraBottom?: number },
) {
  const sceneInsets = useTabSceneInsets();
  return buildTabSceneScrollConfig(sceneInsets, contentContainerStyle, options);
}
