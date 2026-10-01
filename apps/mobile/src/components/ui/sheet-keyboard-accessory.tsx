import { layoutRowEndActions } from '@/theme/layout-styles';
import { Keyboard, Platform, Pressable, StyleSheet, View, InputAccessoryView } from 'react-native';
import { spacing, AppText, font, useStyles, type Theme } from '@/theme';

/** Barre clavier iOS (pavé numérique / champs longs) — « Valider » en français, pas le « Done » anglais de RN. */
export const SHEET_KEYBOARD_ACCESSORY_ID = 'one-sheet-keyboard-valider';
/** Hauteur approximative de la barre (padding + label) — à compter dans le bottomOffset. */
export const SHEET_KEYBOARD_ACCESSORY_HEIGHT = 48;

export function SheetKeyboardAccessory() {
  const styles = useStyles(buildStyles);

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView nativeID={SHEET_KEYBOARD_ACCESSORY_ID}>
      <View style={styles.bar}>
        <Pressable
          onPress={() => Keyboard.dismiss()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Valider"
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <AppText style={styles.label}>Valider</AppText>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}

function buildStyles({ colors: c, fontSize }: Theme) {
  return {
    bar: {
      ...layoutRowEndActions(),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
      backgroundColor: c.surfaceAlt,
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
      ...font.semiBold,
      fontSize: fontSize.base,
      color: c.primary,
    },
  };
}
