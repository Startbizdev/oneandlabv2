import { Platform, type LayoutChangeEvent } from 'react-native';

const TAG = '[tab-scene]';

/** Logs layout / data — filtrer Metro avec `tab-scene`. */
export function tabSceneLog(scope: string, payload: Record<string, unknown>): void {
  if (!__DEV__) return;
  console.warn(`${TAG} ${scope}`, payload);
}

export function tabSceneLayoutHandler(scope: string) {
  return (event: LayoutChangeEvent) => {
    const { width, height, x, y } = event.nativeEvent.layout;
    tabSceneLog(`layout:${scope}`, {
      platform: Platform.OS,
      width: Math.round(width),
      height: Math.round(height),
      x: Math.round(x),
      y: Math.round(y),
      zeroHeight: height < 1,
    });
  };
}

/** Extrait paddingTop/Bottom d’un style scroll (debug). */
export function summarizeScrollContentStyle(style: unknown): Record<string, unknown> {
  if (!style) return { empty: true };
  const flat = Array.isArray(style) ? style : [style];
  let paddingTop = 0;
  let paddingBottom = 0;
  let flexGrow: number | undefined;
  for (const chunk of flat) {
    if (!chunk || typeof chunk !== 'object') continue;
    const s = chunk as Record<string, unknown>;
    if (typeof s.paddingTop === 'number') paddingTop += s.paddingTop;
    if (typeof s.paddingBottom === 'number') paddingBottom += s.paddingBottom;
    if (typeof s.flexGrow === 'number') flexGrow = s.flexGrow;
  }
  return { paddingTop, paddingBottom, flexGrow, chunks: flat.length };
}
