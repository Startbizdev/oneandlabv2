import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_HEADER_INNER_BOTTOM } from '@/components/navigation/header-layout';
import {
  LIQUID_GLASS_HEADER_ROW_MIN_HEIGHT,
  LIQUID_GLASS_LARGE_TITLE_ROW_MIN_HEIGHT,
  NATIVE_TAB_BAR_CONTENT_PADDING_EXTRA,
  type LiquidGlassHeaderVisual,
} from '@/components/navigation/nav-chrome-tokens';
import { estimateNativeTabBarHeight } from '@/navigation/use-native-tab-bar-inset';

type TabSceneInsets = {
  insetTop: number;
  insetBottom: number;
  visual: LiquidGlassHeaderVisual;
};

const TabSceneInsetsContext = createContext<TabSceneInsets>({
  insetTop: 0,
  insetBottom: 0,
  visual: 'inline',
});

export function useLiquidGlassHeaderInset(): number {
  return useContext(TabSceneInsetsContext).insetTop;
}

export function useTabSceneInsetBottom(): number {
  return useContext(TabSceneInsetsContext).insetBottom;
}

export function useTabSceneInsets(): TabSceneInsets {
  return useContext(TabSceneInsetsContext);
}

export function useLiquidGlassHeaderVisual(): LiquidGlassHeaderVisual {
  return useContext(TabSceneInsetsContext).visual;
}

/** Insets header glass flottant + tab bar native flottante (contenu scroll sous les deux). */
export function LiquidGlassHeaderInsetProvider({
  visual,
  children,
}: {
  visual: LiquidGlassHeaderVisual;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const rowHeight =
    visual === 'large' ? LIQUID_GLASS_LARGE_TITLE_ROW_MIN_HEIGHT : LIQUID_GLASS_HEADER_ROW_MIN_HEIGHT;

  const value = useMemo<TabSceneInsets>(
    () => ({
      visual,
      insetTop: insets.top + rowHeight + APP_HEADER_INNER_BOTTOM,
      insetBottom: estimateNativeTabBarHeight(insets.bottom) + NATIVE_TAB_BAR_CONTENT_PADDING_EXTRA,
    }),
    [insets.bottom, insets.top, rowHeight, visual],
  );

  return <TabSceneInsetsContext.Provider value={value}>{children}</TabSceneInsetsContext.Provider>;
}

/** Stack — inset haut uniquement (header glass flottant, pas de tab bar). */
export function StackHeaderInsetProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  const value = useMemo<TabSceneInsets>(
    () => ({
      visual: 'inline',
      insetTop: insets.top + LIQUID_GLASS_HEADER_ROW_MIN_HEIGHT + APP_HEADER_INNER_BOTTOM,
      insetBottom: 0,
    }),
    [insets.top],
  );

  return <TabSceneInsetsContext.Provider value={value}>{children}</TabSceneInsetsContext.Provider>;
}

/** @deprecated Alias — préférer `LiquidGlassHeaderInsetProvider`. */
export const TabSceneInsetsProvider = LiquidGlassHeaderInsetProvider;

type ScrollPaddingOptions = {
  extraTop?: number;
  extraBottom?: number;
};

function readStylePadding(
  style: object | null | undefined,
  key: 'paddingTop' | 'paddingBottom',
): { value: number; rest: object } {
  if (!style || typeof style !== 'object') {
    return { value: 0, rest: {} };
  }
  const record = style as Record<string, unknown>;
  const raw = record[key];
  const value = typeof raw === 'number' ? raw : 0;
  const { [key]: _removed, ...rest } = record;
  return { value, rest };
}

function flattenContentStyles(contentContainerStyle?: StyleProp<ViewStyle>): StyleProp<ViewStyle>[] {
  if (!contentContainerStyle) return [];
  return (Array.isArray(contentContainerStyle)
    ? [...contentContainerStyle]
    : [contentContainerStyle]) as StyleProp<ViewStyle>[];
}

export type TabSceneScrollConfig = {
  contentContainerStyle: object | object[];
  contentInsetAdjustmentBehavior: 'automatic' | 'never';
  scrollIndicatorInsets?: { top: number; bottom: number };
  /** Android — spinner pull-to-refresh sous le header flottant. */
  refreshProgressOffset: number;
};

/**
 * Scroll onglet sous header / tab bar glass.
 * - `paddingTop` / `paddingBottom` sur le contenu (FlashList-safe, départ en haut)
 * - `progressViewOffset` pour le RefreshControl (pas de contentInset — pré-scroll sur FlashList)
 */
export function buildTabSceneScrollConfig(
  insets: Pick<TabSceneInsets, 'insetTop' | 'insetBottom'>,
  contentContainerStyle?: StyleProp<ViewStyle>,
  options: ScrollPaddingOptions = {},
): TabSceneScrollConfig {
  let extraTopFromStyles = 0;
  let extraBottomFromStyles = 0;
  const cleanedStyles: object[] = [];

  for (const style of flattenContentStyles(contentContainerStyle)) {
    if (!style || typeof style !== 'object') {
      continue;
    }

    const top = readStylePadding(style, 'paddingTop');
    const bottom = readStylePadding(top.rest, 'paddingBottom');
    extraTopFromStyles += top.value;
    extraBottomFromStyles += bottom.value;
    cleanedStyles.push(bottom.rest);
  }

  const hasSceneInsets = insets.insetTop > 0 || insets.insetBottom > 0;
  const padTop = insets.insetTop + (options.extraTop ?? 0) + extraTopFromStyles;
  const padBottom = insets.insetBottom + (options.extraBottom ?? 0) + extraBottomFromStyles;

  const scenePad: Record<string, number> = {};
  if (padTop > 0) scenePad.paddingTop = padTop;
  if (padBottom > 0) scenePad.paddingBottom = padBottom;

  const mergedContentStyle =
    Object.keys(scenePad).length === 0
      ? cleanedStyles.length > 0
        ? cleanedStyles
        : [{}]
      : cleanedStyles.length > 0
        ? [scenePad, ...cleanedStyles]
        : scenePad;

  if (!hasSceneInsets) {
    return {
      contentContainerStyle: mergedContentStyle,
      contentInsetAdjustmentBehavior: 'automatic',
      refreshProgressOffset: 0,
    };
  }

  return {
    contentContainerStyle: mergedContentStyle,
    contentInsetAdjustmentBehavior: 'never',
    scrollIndicatorInsets: { top: padTop, bottom: padBottom },
    refreshProgressOffset: padTop,
  };
}

/** Props scroll (hors contentContainerStyle) à étaler sur ScrollView / FlatList / FlashList. */
export function spreadTabSceneScrollProps(config: TabSceneScrollConfig) {
  return {
    contentInsetAdjustmentBehavior: config.contentInsetAdjustmentBehavior,
    scrollIndicatorInsets: config.scrollIndicatorInsets,
  };
}

/** @deprecated Préférer `buildTabSceneScrollConfig`. */
export function mergeTabSceneScrollPadding(
  insets: Pick<TabSceneInsets, 'insetTop' | 'insetBottom'>,
  contentContainerStyle?: StyleProp<ViewStyle>,
  options: ScrollPaddingOptions = {},
): object | object[] {
  return buildTabSceneScrollConfig(insets, contentContainerStyle, options).contentContainerStyle;
}

/** @deprecated Utiliser `mergeTabSceneScrollPadding`. */
export function mergeLiquidGlassScrollPadding(
  insetTop: number,
  contentContainerStyle?: StyleProp<ViewStyle>,
  extraTop = 0,
): object | object[] {
  return mergeTabSceneScrollPadding({ insetTop, insetBottom: 0 }, contentContainerStyle, {
    extraTop,
  });
}
