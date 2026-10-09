import { forwardRef, useState, type ComponentProps } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useSceneBottomInset } from '@/navigation/use-scene-bottom-inset';
import { AppText, H_PADDING, spacing, useStyles, type Theme } from '@/theme';
import { PatientAiChatComposer } from './PatientAiChatComposer';
import { CARY_AI_NOTICE } from './CaryAiDisclosure';

type Props = ComponentProps<typeof PatientAiChatComposer>;

/**
 * Bas de l'écran Cary, dans le flux (la liste se réduit d'autant) : compositeur, rappel IA
 * (masqué pendant la saisie), puis réserve clavier / safe area. Seul mécanisme clavier de l'écran.
 */
export const PatientAiChatFooter = forwardRef<TextInput, Props>(function PatientAiChatFooter(
  { onFocus, onBlur, ...composerProps },
  inputRef,
) {
  const styles = useStyles(buildStyles);
  const { safeAreaBottom, tabBarHeight } = useSceneBottomInset();
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation();
  const [inputFocused, setInputFocused] = useState(false);

  const keyboardSpace = useAnimatedStyle(() => ({
    height: Math.max(safeAreaBottom, -keyboardHeight.value - tabBarHeight),
  }));

  return (
    <View style={styles.shell}>
      <PatientAiChatComposer
        ref={inputRef}
        {...composerProps}
        onFocus={() => {
          setInputFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          setInputFocused(false);
          onBlur?.();
        }}
      />
      {!inputFocused ? (
        <AppText variant="caption" style={styles.notice}>
          {CARY_AI_NOTICE}
        </AppText>
      ) : null}
      <Animated.View style={keyboardSpace} />
    </View>
  );
});

function buildStyles({ colors: c }: Theme) {
  return {
    shell: {
      width: '100%' as const,
      backgroundColor: c.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderLight,
    },
    notice: {
      textAlign: 'center' as const,
      paddingHorizontal: H_PADDING,
      paddingBottom: spacing[1],
    },
  };
}
