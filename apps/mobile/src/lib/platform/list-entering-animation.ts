import { Platform, View, type ViewProps } from 'react-native';
import Animated, { type AnimatedProps } from 'react-native-reanimated';
import { FadeIn, FadeInDown } from 'react-native-reanimated';

/** Évite `Animated.View` sans animation — sur Android le layout entering peut rester à opacité 0. */
export function enteringShell(entering: AnimatedProps<ViewProps>['entering'] | undefined) {
  return entering ? Animated.View : View;
}

/**
 * Animations `entering` Reanimated dans une liste NativeTabs Android :
 * le layout ne déclenche pas toujours l’entrée → opacité 0, écran blanc.
 * Préférer `enteringShell()` + FlatList (pas ScrollView mappé).
 */
export function listItemEntering(index = 0) {
  if (Platform.OS === 'android') return undefined;
  return FadeIn.delay(index * 50).duration(350);
}

export function emptyStateEntering() {
  if (Platform.OS === 'android') return undefined;
  return FadeInDown.duration(400).springify();
}

/** Bloc en-tête / section dans un ScrollView d’onglet. */
export function scrollSectionEntering(delay = 0, duration = 280) {
  if (Platform.OS === 'android') return undefined;
  return FadeInDown.delay(delay).duration(duration).springify();
}

/** Item indexé dans un ScrollView (tournée, timeline, avis…). */
export function scrollChildEntering(index = 0, delayPerItem = 50, duration = 300) {
  if (Platform.OS === 'android') return undefined;
  return FadeInDown.delay(index * delayPerItem).duration(duration).springify();
}
