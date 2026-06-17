import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { InteractionManager } from 'react-native';

type ScrollableNode = {
  scrollToOffset?: (opts: { offset: number; animated?: boolean }) => void;
  scrollTo?: (opts: { x?: number; y?: number; animated?: boolean }) => void;
};

function scrollNodeToTop(node: ScrollableNode | null | undefined) {
  if (!node) return;
  if (typeof node.scrollToOffset === 'function') {
    node.scrollToOffset({ offset: 0, animated: false });
    return;
  }
  if (typeof node.scrollTo === 'function') {
    node.scrollTo({ y: 0, animated: false });
  }
}

function scheduleScrollToTop(ref: RefObject<ScrollableNode | null>) {
  InteractionManager.runAfterInteractions(() => {
    scrollNodeToTop(ref.current);
    requestAnimationFrame(() => scrollNodeToTop(ref.current));
  });
}

const APP_ROOT_ROUTE_NAMES = new Set([
  '(auth)',
  '(nurse)',
  '(pro)',
  '(preleveur)',
  '(patient)',
  'profile',
  'notifications',
  'index',
]);

/**
 * Nombre de routes du stack rôle (ex. nurse/pro/patient) qui contient `(tabs)`,
 * ou à défaut du premier stack interne (profil, etc.).
 */
function getRoleStackRouteCount(navigation: NavigationProp<ParamListBase>): number {
  let nav: NavigationProp<ParamListBase> | undefined = navigation;
  let fallbackStackCount = 0;

  while (nav) {
    const state = nav.getState();
    if (!state || !('routes' in state) || !Array.isArray(state.routes)) {
      nav = nav.getParent();
      continue;
    }

    const routes = state.routes;
    if (routes.some((r) => r.name === '(tabs)' || String(r.name).startsWith('(tabs)'))) {
      return routes.length;
    }

    if ('type' in state && state.type === 'stack') {
      const names = routes.map((r) => String(r.name));
      const isAppRoot = names.some((n) => APP_ROOT_ROUTE_NAMES.has(n));
      if (!isAppRoot) {
        fallbackStackCount = routes.length;
      }
    }

    nav = nav.getParent();
  }

  return fallbackStackCount;
}

/**
 * Remonte le scroll en haut quand on revient sur l'écran après un pop stack.
 * Ne réagit pas au changement d'onglet (la profondeur stack reste identique).
 */
export function useScrollToTopOnPop(ref: RefObject<ScrollableNode | null>) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const stackDepthRef = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      const currentDepth = getRoleStackRouteCount(navigation);
      const prev = stackDepthRef.current;

      if (prev !== null && prev > currentDepth) {
        scheduleScrollToTop(ref);
      }

      stackDepthRef.current = currentDepth;

      return () => {
        stackDepthRef.current = getRoleStackRouteCount(navigation);
      };
    }, [navigation, ref]),
  );
}
