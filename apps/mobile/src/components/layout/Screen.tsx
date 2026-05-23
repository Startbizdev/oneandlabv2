import React, { type ReactNode } from 'react';
import { View, StyleSheet, type ScrollViewProps, type ViewStyle } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { KeyboardScrollView } from './KeyboardScrollView';
import { colors, spacing } from '@/theme';

/**
 * Conteneur d'écran sans SafeAreaView.
 * La safe area haut/bas est gérée par React Navigation (header + tab bar).
 * @see https://reactnavigation.org/docs/handling-safe-area/
 */
interface BaseScreenProps {
  children: ReactNode;
  style?: ViewStyle;
  backgroundColor?: string;
}

interface StaticScreenProps extends BaseScreenProps {
  scroll?: false;
  contentStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
}

interface ScrollScreenProps extends BaseScreenProps {
  scroll: true;
  contentStyle?: ViewStyle;
  scrollProps?: Omit<ScrollViewProps, 'children' | 'contentContainerStyle'>;
  keyboardAvoiding?: boolean;
}

type ScreenProps = StaticScreenProps | ScrollScreenProps;

export function Screen({
  children,
  style,
  backgroundColor = colors.background,
  ...rest
}: ScreenProps) {
  const bg = { backgroundColor };

  if ('scroll' in rest && rest.scroll) {
    const { contentStyle, scrollProps, keyboardAvoiding = true } = rest as ScrollScreenProps;

    if (keyboardAvoiding) {
      return (
        <View style={[styles.flex, bg, style]}>
          <KeyboardScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, contentStyle]}
            {...scrollProps}
          >
            {children}
          </KeyboardScrollView>
        </View>
      );
    }

    return (
      <View style={[styles.flex, bg, style]}>
        <KeyboardScrollView
          enabled={false}
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          {...scrollProps}
        >
          {children}
        </KeyboardScrollView>
      </View>
    );
  }

  const { contentStyle, keyboardAvoiding = false } = rest as StaticScreenProps;

  const content = (
    <View style={[styles.flex, styles.staticContent, contentStyle]}>{children}</View>
  );

  return (
    <View style={[styles.flex, bg, style]}>
      {keyboardAvoiding ? (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
});
