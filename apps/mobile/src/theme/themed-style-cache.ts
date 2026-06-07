import { getColorblindType } from './colors';
import { getTextScale } from './text-scale';

type NamedStyles = Record<string, object>;

const themedStyleCache = new Map<string, { themeKey: string; styles: NamedStyles }>();

export function getThemedStyleCacheEntry(id: string) {
  return themedStyleCache.get(id);
}

export function setThemedStyleCacheEntry(
  id: string,
  entry: { themeKey: string; styles: NamedStyles },
) {
  themedStyleCache.set(id, entry);
}

export function clearThemedStyleCache(): void {
  themedStyleCache.clear();
}

export function getThemeCacheKey(): string {
  return `${getColorblindType()}:${getTextScale()}`;
}
