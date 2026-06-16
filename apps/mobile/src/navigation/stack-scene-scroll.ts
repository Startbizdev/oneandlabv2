import type { ScrollViewProps } from 'react-native';

/**
 * Scroll stack iOS 26 — contenu edge-to-edge sous header natif transparent.
 * Préférer `automatic` plutôt que paddingTop manuel.
 */
export const STACK_SCROLL_PROPS = {
  contentInsetAdjustmentBehavior: 'automatic',
  showsVerticalScrollIndicator: false,
} as const satisfies Pick<ScrollViewProps, 'contentInsetAdjustmentBehavior' | 'showsVerticalScrollIndicator'>;

export function stackScrollProps(
  overrides?: Pick<ScrollViewProps, 'showsVerticalScrollIndicator'>,
): typeof STACK_SCROLL_PROPS {
  return { ...STACK_SCROLL_PROPS, ...overrides };
}
