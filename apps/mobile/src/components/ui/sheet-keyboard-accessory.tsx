import { useAppColors } from '@/theme/use-app-colors';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View, InputAccessoryView } from 'react-native';
import { spacing } from '@/theme';
import { fontFamily, fontSize } from '@/theme/typography';

/** Barre clavier iOS (pavé numérique) — « Valider » en français, pas le « Done » anglais de RN. */
export const SHEET_KEYBOARD_ACCESSORY_ID = 'one-sheet-keyboard-valider';

export function SheetKeyboardAccessory() {
  const c = useAppColors();

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView nativeID={SHEET_KEYBOARD_ACCESSORY_ID}>
      <View style={[styles.bar, { borderTopColor: c.borderLight, backgroundColor: c.surfaceAlt }]}>
        <Pressable
          onPress={() => Keyboard.dismiss()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Valider"
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={[styles.label, { color: c.primary }]}>Valider</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  btn: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  btnPressed: {
    opacity: 0.65,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: fontSize.base,
  },
});
