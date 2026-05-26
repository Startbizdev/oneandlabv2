import { createContext, useContext } from 'react';
import { TextInput } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

const SheetKeyboardContext = createContext(false);

/** Actif dans le contenu d’un {@link SheetModal} — inputs doivent utiliser BottomSheetTextInput. */
export function SheetKeyboardProvider({ children }: { children: React.ReactNode }) {
  return <SheetKeyboardContext.Provider value={true}>{children}</SheetKeyboardContext.Provider>;
}

export function useInBottomSheet(): boolean {
  return useContext(SheetKeyboardContext);
}

/**
 * @gorhom/bottom-sheet — TextInput natif ignoré par le gestionnaire clavier.
 * @see https://gorhom.dev/react-native-bottom-sheet/keyboard-handling
 */
export function useSheetTextInputComponent() {
  return useInBottomSheet() ? BottomSheetTextInput : TextInput;
}
