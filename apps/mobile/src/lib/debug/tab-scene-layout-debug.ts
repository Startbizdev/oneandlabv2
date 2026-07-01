import type { LayoutChangeEvent } from 'react-native';

/** Handler onLayout optionnel — logs Metro en __DEV__ uniquement. */
export function tabSceneLayoutHandler(label: string) {
  return (event: LayoutChangeEvent) => {
    if (!__DEV__) return;
    const { width, height, x, y } = event.nativeEvent.layout;
    console.log(`[tab-scene] ${label}`, { width, height, x, y });
  };
}
