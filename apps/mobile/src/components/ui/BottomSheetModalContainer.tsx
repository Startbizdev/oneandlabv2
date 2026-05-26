import type { PropsWithChildren } from 'react';
import { FullWindowOverlay } from 'react-native-screens';

/**
 * Conteneur gorhom `containerComponent` — place le modal au-dessus des écrans
 * natifs `fullScreenModal` / stack (react-native-screens).
 * @see https://gorhom.dev/react-native-bottom-sheet/modal/props#containercomponent
 */
export function BottomSheetModalContainer({ children }: PropsWithChildren) {
  return <FullWindowOverlay>{children}</FullWindowOverlay>;
}
